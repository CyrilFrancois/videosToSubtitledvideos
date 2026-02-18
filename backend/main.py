import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Any, Set

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
        # Track active paths to prevent re-processing the same file simultaneously
        self.active_jobs: Set[str] = set()

    async def run_batch(self, videos: List[VideoJob], opts: GlobalOptions):
        """Processes a list of videos one by one."""
        total = len(videos)
        for idx, video in enumerate(videos):
            await self.execute_pipeline(video, opts, idx, total)

    async def execute_pipeline(self, video: VideoJob, opts: GlobalOptions, index: int, total: int):
        fid = video.path
        
        # 1. Prevent duplicate processing
        if fid in self.active_jobs:
            logger.warning(f"⚠️ [Skip] {video.name} is already being processed.")
            return
        
        self.active_jobs.add(fid)
        log_handler = setup_logging_bridge(fid)
        start_time = time.time()
        p = f"[{index + 1}/{total} Files]"
        
        # Determine temporary audio path (usually same name as video but .wav)
        temp_audio = Path(video.path).with_suffix(".wav")
        
        logger.info(f"🚀 {p} STARTING: {video.name}")

        try:
            # STEP 1: CONTEXT
            event_manager.emit(fid, "processing", 5, f"{p} Step 1/5: Analyzing context...")
            logger.info(f"   {p} 🔍 Step 1/4: Analyzing context...")
            context = self.translator.get_context_profile(video.name)

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
                logger.info(f"   {p} 🎙️ Step 2/4: Running Whisper inference...")
                srt_content = self.transcriber.transcribe(
                    video_path=video.path, 
                    file_id=fid, 
                    on_progress=event_manager.emit,
                    current_file=index + 1,
                    total_files=total
                )

            # STEP 3: SYNC
            if video.syncOffset != 0:
                logger.info(f"   {p} ⏱️ Step 2'/4: Applying {video.syncOffset}s offset...")
                srt_content = self.processor.apply_offset(srt_content, video.syncOffset)

            # STEP 4: TRANSLATION
            translated_map = {}
            for i, lang_code in enumerate(video.out):
                progress = 40 + (i * (40 // len(video.out)))
                event_manager.emit(fid, "processing", progress, f"{p} Step 4/5: Translating to {lang_code.upper()}...")
                logger.info(f"   {p} 🌐 Step 3/4: Translating to [{lang_code}]...")
                
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
                    out_srt = Path(video.path).with_suffix(f".{lang_code}.srt")
                    with open(out_srt, "w", encoding="utf-8") as f:
                        f.write(translation)
                    logger.info(f"Saved SRT: {out_srt.name}")

            # STEP 5: MUXING
            logger.info(f"   {p} 🛠️  Creating the ouput file")
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
            # --- CLEANUP ---
            # Remove from active jobs
            self.active_jobs.discard(fid)
            
            # Remove temp audio if it exists
            if temp_audio.exists():
                try:
                    temp_audio.unlink()
                    logger.info(f"Cleaned up temporary audio track.")
                except Exception as cleanup_err:
                    logger.warning(f"   {p} ⚠️ Cleanup failed for {temp_audio.name}: {cleanup_err}")
            
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
    # We submit the whole list as one background task to ensure sequential execution
    background_tasks.add_task(orchestrator.run_batch, request.videos, request.globalOptions)
    return {"status": "accepted", "count": len(request.videos)}

@app.get("/api/events/{file_id:path}")
async def events(file_id: str):
    return StreamingResponse(event_manager.subscribe(file_id), media_type="text/event-stream")

@app.get("/health")
async def health():
    return {"status": "online" if orchestrator else "initializing"}