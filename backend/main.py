import logging
import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Any

# Core Imports
from core.scanner import VideoScanner
from core.subtitle_processor import SubtitleProcessor
from core.transcriber import VideoTranscriber
from core.translator import SubtitleTranslator
from core.muxer import VideoMuxer
from core.events import event_manager, setup_logging_bridge

# --- LOGGING CONFIGURATION ---
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger("SubStudio.Main")

# --- DATA MODELS ---

class VideoJob(BaseModel):
    name: str 
    path: str 
    src: Optional[Any] = "auto"
    out: List[str] = ["fr"]
    workflowMode: str = "whisper"
    syncOffset: float = 0.0
    stripExistingSubs: bool = False

class GlobalOptions(BaseModel):
    transcriptionEngine: str = "base"
    generateSRT: bool = True
    muxIntoMkv: bool = True
    cleanUp: bool = False

class ProcessRequest(BaseModel):
    videos: List[VideoJob]
    globalOptions: GlobalOptions

# --- ORCHESTRATOR ---

class PipelineOrchestrator:
    def __init__(self):
        self.scanner = VideoScanner(base_path="/data")
        self.processor = SubtitleProcessor()
        self.transcriber = VideoTranscriber(model_size="base")
        self.translator = SubtitleTranslator()
        self.muxer = VideoMuxer()

    async def execute_pipeline(self, video: VideoJob, opts: GlobalOptions, index: int, total: int):
        fid = video.path
        log_handler = setup_logging_bridge(fid)
        start_time = time.time()
        
        # Consistent prefix for all logs
        p = f"[{index + 1}/{total} Files]"
        
        logger.info(f"🚀 {p} STARTING: {video.name}")

        try:
            # STEP 1: CONTEXT
            event_manager.emit(fid, "processing", 5, f"{p} Step 1/5: Analyzing context...")
            logger.info(f"   {p} 🔍 Step 1/5: Analyzing context...")
            context = self.translator.get_context_profile(video.name)
            logger.info("Context: " + context)

            # STEP 2: SOURCE (Transcription)
            srt_content = ""
            is_whisper = True
            if video.workflowMode == "srt":
                event_manager.emit(fid, "processing", 10, f"{p} Step 2/5: Checking local subs...")
                srt_content = self.processor.load_existing_subtitles({"filePath": video.path, "fileName": video.name}, None)
                if srt_content:
                    is_whisper = False
                    logger.info(f"   {p} ✅ Found local SRT.")

            if not srt_content:
                logger.info(f"   {p} 🎙️ Step 2/5: Running Whisper inference...")
                srt_content = self.transcriber.transcribe(
                    video_path=video.path, 
                    file_id=fid, 
                    on_progress=event_manager.emit,
                    current_file=index + 1,
                    total_files=total
                )

            # STEP 3: SYNC
            if video.syncOffset != 0:
                logger.info(f"   {p} ⏱️ Step 3/5: Applying {video.syncOffset}s offset...")
                srt_content = self.processor.apply_offset(srt_content, video.syncOffset)
            else:
                logger.info(f"   {p} ⏩ Step 3/5: Skipping offset.")

            # STEP 4: TRANSLATION
            translated_map = {}
            for i, lang_code in enumerate(video.out):
                progress = 40 + (i * (40 // len(video.out)))
                event_manager.emit(fid, "processing", progress, f"{p} Step 4/5: Translating to {lang_code.upper()}...")
                logger.info(f"   {p} 🌐 Step 4/5: Translating to [{lang_code}]...")
                
                # FIX: Pass current_file and total_files to avoid TypeError
                translation = self.translator.refine_and_translate(
                    srt_content=srt_content,
                    target_lang=lang_code,
                    file_id=fid,
                    on_progress=event_manager.emit,
                    task_manager=type('Task', (object,), {'is_aborted': False}),
                    context_profile=context,
                    current_file=index + 1,
                    total_files=total,
                    is_whisper_source=is_whisper
                )
                translated_map[lang_code] = translation
                
                if opts.generateSRT:
                    out_path = f"{os.path.splitext(video.path)[0]}.{lang_code}.srt"
                    with open(out_path, "w", encoding="utf-8") as f:
                        f.write(translation)
                    logger.info(f"   {p} 💾 Saved SRT: {os.path.basename(out_path)}")

            # STEP 5: MUXING
            if opts.muxIntoMkv:
                self.muxer.mux(
                    video_path=video.path,
                    srts=translated_map,
                    current_file=index + 1,
                    total_files=total,
                    strip_existing=video.stripExistingSubs,
                    cleanup_original=opts.cleanUp
                )

            elapsed = round(time.time() - start_time, 1)
            event_manager.emit(fid, "done", 100, f"Finished in {elapsed}s")
            logger.info(f"✅ {p} COMPLETED: {video.name} ({elapsed}s)")

        except Exception as e:
            logger.error(f"❌ {p} PIPELINE ERROR: {str(e)}")
            event_manager.emit(fid, "error", 0, f"Error: {str(e)}")
        finally:
            logging.getLogger().removeHandler(log_handler)

# --- LIFESPAN ---
orchestrator = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global orchestrator
    orchestrator = PipelineOrchestrator()
    yield

# --- API ---
app = FastAPI(title="SubStudio Pro", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/api/scan")
async def scan(target_path: str = Query("/data")):
    return {"files": orchestrator.scanner.scan(target_path)}

@app.post("/api/process")
async def process(request: ProcessRequest, background_tasks: BackgroundTasks):
    total = len(request.videos)
    for idx, video in enumerate(request.videos):
        background_tasks.add_task(orchestrator.execute_pipeline, video, request.globalOptions, idx, total)
    return {"status": "accepted", "count": total}

@app.get("/api/events/{file_id:path}")
async def events(file_id: str):
    return StreamingResponse(event_manager.subscribe(file_id), media_type="text/event-stream")

@app.get("/health")
async def health():
    return {"status": "online" if orchestrator else "initializing"}