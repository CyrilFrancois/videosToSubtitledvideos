import logging
import os
import time
import asyncio
import json
import re
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, BackgroundTasks, Query, Request
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
    selectedSrtPath: Optional[str] = None 
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
        
        self.active_jobs: Set[str] = set()
        self._last_scan_time = 0
        self._cached_files = []

    def split_long_lines(self, srt_text: str, max_chars: int = 45) -> str:
        """Adds \n to subtitle lines that are too long."""
        def process_block(match):
            index, times, text = match.groups()
            lines = text.strip().split('\n')
            new_lines = []
            
            for line in lines:
                if len(line) > max_chars:
                    # Find space closest to the middle to split
                    mid = len(line) // 2
                    space_indices = [i for i, char in enumerate(line) if char == ' ']
                    if space_indices:
                        best_space = min(space_indices, key=lambda x: abs(x - mid))
                        line = line[:best_space] + '\n' + line[best_space+1:]
                new_lines.append(line)
            
            # Fix: Join lines into a variable first to avoid backslashes in the f-string
            joined_content = '\n'.join(new_lines)
            return f"{index}\n{times}\n{joined_content}\n\n"

        # Regex to match SRT blocks: Index, Time range, and Text content
        pattern = re.compile(r"(\d+)\n(\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?:\n\n|\Z)")
        return pattern.sub(process_block, srt_text)

    def get_files(self, target_path: str):
        now = time.time()
        if now - self._last_scan_time < 2.0:
            return self._cached_files
        
        self._cached_files = self.scanner.scan(target_path)
        self._last_scan_time = now
        return self._cached_files

    async def run_batch(self, videos: List[VideoJob], opts: GlobalOptions):
        total = len(videos)
        try:
            for idx, video in enumerate(videos):
                if video.path in self.active_jobs:
                    logger.warning(f"⚠️ [Skip] {video.name} is already in the pipeline.")
                    continue
                await self.execute_pipeline(video, opts, idx, total)
        finally:
            # --- NOTIFY FRONTEND FINISHED ---
            # We use a reserved ID "system_events" to signal the UI to unlock
            logger.info("🏁 BATCH PROCESSING FINISHED")
            event_manager.emit("system_events", "batch_done", 100, "All tasks completed")

    async def execute_pipeline(self, video: VideoJob, opts: GlobalOptions, index: int, total: int):
        fid = video.path
        self.active_jobs.add(fid) 
        
        log_handler = setup_logging_bridge(fid)
        temp_audio = Path(video.path).with_suffix(".tmp.wav")
        p = f"[{index + 1}/{total} Files]"
        
        logger.info(f"🚀 {p} STARTING: {video.name}")

        try:
            # STEP 1: CONTEXT
            event_manager.emit(fid, "processing", 5, f"{p} Step 1/5: Analyzing context...")
            context = self.translator.get_context_profile(video.name)

            # STEP 2: SOURCE
            srt_content = ""
            is_whisper = True
            
            # Use specific selected path if provided
            if video.workflowMode in ["srt", "hybrid"]:
                potential_paths = []
                if video.selectedSrtPath:
                    potential_paths.append(Path(video.selectedSrtPath))
                
                video_path = Path(video.path)
                potential_paths.append(video_path.with_suffix(".srt"))
                
                found_path = next((p for p in potential_paths if p.exists() and p.is_file()), None)

                if found_path:
                    logger.info(f"🔍 Found SRT at: {found_path}")
                    event_manager.emit(fid, "processing", 10, f"{p} Found SRT {found_path.name}")
                    with open(found_path, "r", encoding="utf-8", errors="ignore") as f:
                        srt_content = f.read()
                    is_whisper = False

            if not srt_content:
                event_manager.emit(fid, "processing", 15, f"{p} Transcribing with Whisper...")
                srt_content = self.transcriber.transcribe(
                    video_path=video.path, 
                    file_id=fid, 
                    on_progress=event_manager.emit,
                    current_file=index + 1,
                    total_files=total
                )

            # STEP 3: SYNC
            if video.syncOffset != 0:
                srt_content = self.processor.apply_offset(srt_content, video.syncOffset)

            # STEP 4: TRANSLATION
            translated_map = {}
            for lang_code in video.out:
                event_manager.emit(fid, "processing", 50, f"{p} Translating to {lang_code}...")
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
                
                # --- APPLY LINE SPLITTING ---
                #translation = self.split_long_lines(translation)
                translated_map[lang_code] = translation
                
                if opts.generateSRT:
                    out_srt = Path(video.path).with_suffix(f".{lang_code}.srt")
                    with open(out_srt, "w", encoding="utf-8") as f:
                        f.write(translation)

            # STEP 5: MUXING
            if opts.muxIntoMkv:
                event_manager.emit(fid, "processing", 90, f"{p} Muxing into MKV...")
                self.muxer.mux(
                    video_path=video.path,
                    srts=translated_map,
                    current_file=index + 1,
                    total_files=total,
                    strip_existing=video.stripExistingSubs,
                    cleanup_original=opts.cleanUp
                )

            event_manager.emit(fid, "done", 100, "Processing Complete")
            logger.info(f"✅ {p} COMPLETED: {video.name}")

        except Exception as e:
            logger.error(f"❌ {p} ERROR: {str(e)}")
            event_manager.emit(fid, "error", 0, str(e))
        finally:
            self.active_jobs.discard(fid)
            if temp_audio.exists():
                try: temp_audio.unlink()
                except: pass
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
    return {"files": orchestrator.get_files(target_path)}

@app.post("/api/process")
async def process(request: ProcessRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(orchestrator.run_batch, request.videos, request.globalOptions)
    return {"status": "accepted", "count": len(request.videos)}

@app.get("/api/events/{file_id:path}")
async def events(file_id: str):
    # This endpoint works for both specific file IDs and "system_events"
    return StreamingResponse(event_manager.subscribe(file_id), media_type="text/event-stream")

@app.get("/health")
async def health():
    return {"status": "online" if orchestrator else "initializing"}