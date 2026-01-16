import asyncio
import os
import signal
import logging
import json
import shutil
import ffmpeg
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
from pathlib import Path

# Import Core Services
from core.scanner import VideoScanner
from core.subtitle_processor import SubtitleProcessor
from core.transcriber import VideoTranscriber
from core.translator import SubtitleTranslator
from core.muxer import VideoMuxer
from core.events import event_manager

# --- LOGGING ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SubStudio")

# --- DATA MODELS ---
class VideoJob(BaseModel):
    name: str
    path: str
    srtFoundPath: Optional[str] = "None"
    src: str = "auto"
    out: List[str] = ["fr"]
    workflowMode: str = "srt" # Default to srt since you have embedded/local files
    syncOffset: int = 0

class GlobalOptions(BaseModel):
    transcriptionEngine: str = "base"
    generateSRT: bool = True
    muxIntoMkv: bool = True
    cleanUp: bool = False

class ProcessRequest(BaseModel):
    videos: List[VideoJob]
    globalOptions: GlobalOptions

# --- TASK MANAGER ---
class TaskManager:
    def __init__(self):
        self.active_pid: Optional[int] = None
        self.is_aborted: bool = False
        self.queue: List[VideoJob] = []
        self.current_fid: Optional[str] = None
        self.artifacts: List[str] = []

    def register_artifact(self, path: str):
        if path and path not in self.artifacts:
            self.artifacts.append(path)
            logger.info(f"📍 Registered artifact: {path}")

    def abort_all(self):
        logger.warning("🚨 [ABORT] Stop signal received.")
        self.is_aborted = True
        self.queue = []
        if self.active_pid:
            try:
                os.kill(self.active_pid, signal.SIGTERM)
                logger.info(f"💀 Killed PID: {self.active_pid}")
            except Exception as e:
                logger.error(f"Failed to kill PID {self.active_pid}: {e}")
        self.cleanup_artifacts()

    def cleanup_artifacts(self):
        for path in self.artifacts:
            if os.path.exists(path):
                try:
                    os.remove(path)
                    logger.info(f"🧹 Cleaned up artifact: {path}")
                except: pass
        self.artifacts = []

# --- INITIALIZATION ---
app = FastAPI(title="SubStudio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

task_manager = TaskManager()
scanner = VideoScanner(base_path="/data")
processor = SubtitleProcessor()
transcriber = VideoTranscriber(model_size="base")
translator = SubtitleTranslator()
muxer = VideoMuxer()

# --- HELPER FUNCTIONS ---

def get_embedded_languages(video_path: str) -> List[str]:
    """Returns a list of ISO codes for languages already inside the file."""
    try:
        probe = ffmpeg.probe(video_path)
        return [s.get('tags', {}).get('language', 'und') for s in probe.get('streams', []) if s['codec_type'] == 'subtitle']
    except:
        return []

# --- PIPELINE EXECUTION ---
async def run_linear_pipeline(request: ProcessRequest):
    task_manager.is_aborted = False
    task_manager.queue = request.videos
    opts = request.globalOptions

    # Map for language matching (ISO-639-1 to ISO-639-2)
    iso_map = {'fr': 'fra', 'en': 'eng', 'es': 'spa', 'de': 'deu', 'it': 'ita', 'pt': 'por', 'ja': 'jpn'}

    while task_manager.queue:
        if task_manager.is_aborted: break

        video = task_manager.queue.pop(0)
        fid = video.path 
        task_manager.current_fid = fid

        try:
            logger.info(f"🎬 [STARTING] {video.name}")
            
            # 1. Check which languages are REALLY needed
            embedded_langs = get_embedded_languages(video.path)
            needed_langs = []
            translated_map = {}

            for lang in video.out:
                srt_name = f"{os.path.splitext(video.path)[0]}.{lang}.srt"
                iso_3 = iso_map.get(lang, lang)
                
                # Skip if .srt exists on disk
                if os.path.exists(srt_name):
                    logger.info(f"⏭️ [SKIP] {lang.upper()} SRT already exists on disk.")
                    with open(srt_name, 'r', encoding='utf-8') as f:
                        translated_map[lang] = f.read()
                # Skip if language is already embedded in the MKV
                elif iso_3 in embedded_langs:
                    logger.info(f"⏭️ [SKIP] {lang.upper()} already embedded in file.")
                    # We don't add to translated_map because it's already in the source
                else:
                    needed_langs.append(lang)

            # 2. If no new translations are needed, jump to muxing
            if not needed_langs:
                logger.info(f"✅ All requested languages present for {video.name}. Skipping to Muxer.")
            else:
                # PHASE 0: Context
                event_manager.emit(fid, "processing", 5, "Initializing Story Bible...")
                context_bible = translator.get_context_profile(video.name)

                # PHASE 1: Text Acquisition
                srt_content = ""
                is_whisper = False

                if video.workflowMode == "srt":
                    if video.srtFoundPath == "Embedded":
                        logger.info(f"📦 [SOURCE] Extracting embedded SRT for translation source...")
                        srt_content = muxer.extract_subtitle(video.path) # Assumes you added this to muxer
                    elif video.srtFoundPath and os.path.exists(video.srtFoundPath):
                        logger.info(f"📂 [SOURCE] Using local SRT: {video.srtFoundPath}")
                        with open(video.srtFoundPath, 'r', encoding='utf-8') as f:
                            srt_content = f.read()

                if not srt_content or video.workflowMode == "whisper":
                    logger.info(f"🎙️ [SOURCE] Running AI Transcription")
                    event_manager.emit(fid, "processing(15%)", 15, "AI Transcribing...")
                    srt_content = transcriber.transcribe(video.path, fid, event_manager.emit, task_manager)
                    is_whisper = True

                # PHASE 2 & 3: Translation (Only for needed_langs)
                for lang in needed_langs:
                    if task_manager.is_aborted: break
                    event_manager.emit(fid, "translating", 40, f"Translating to {lang.upper()}...")
                    translation = translator.refine_and_translate(
                        srt_content, lang, fid, event_manager.emit, task_manager, context_bible, is_whisper
                    )
                    translated_map[lang] = translation
                    
                    # Immediate Save to Disk
                    if opts.generateSRT:
                        srt_export_path = f"{os.path.splitext(video.path)[0]}.{lang}.srt"
                        with open(srt_export_path, "w", encoding="utf-8") as f:
                            f.write(translation)

            # PHASE 4: Muxing (Always run to ensure final file is consistent)
            if opts.muxIntoMkv and not task_manager.is_aborted:
                event_manager.emit(fid, "muxing", 85, "Muxing into final MKV...")
                muxer.mux(
                    video_path=video.path,
                    translated_srts=translated_map,
                    file_id=fid,
                    on_progress=event_manager.emit,
                    task_manager=task_manager,
                    cleanup_original=opts.cleanUp
                )

            event_manager.emit(fid, "done", 100, "Successfully completed!")
            logger.info(f"✅ [FINISHED] {video.name}")
            
        except Exception as e:
            logger.error(f"❌ [PIPELINE ERROR] {fid}: {str(e)}")
            event_manager.emit(fid, "error", 0, f"Error: {str(e)}")
        finally:
            task_manager.artifacts = []

    task_manager.current_fid = None

# --- API ENDPOINTS ---

@app.get("/api/scan")
async def scan_library(target_path: str = Query("/data")):
    items = scanner.scan(target_path=target_path, recursive=True)
    return {"files": items}

@app.post("/api/process")
async def start_processing(request: ProcessRequest, background_tasks: BackgroundTasks):
    try:
        payload_debug = json.dumps(request.model_dump(), indent=4)
        logger.info(f"\n🚀 [INCOMING REQUEST]\n{payload_debug}\n")
    except: pass

    if task_manager.current_fid and not task_manager.is_aborted:
        task_manager.queue.extend(request.videos)
        for v in request.videos:
            event_manager.emit(v.path, "queued", 0, "Waiting in queue...")
        return {"status": "queued", "count": len(request.videos)}
    
    background_tasks.add_task(run_linear_pipeline, request)
    return {"status": "started", "video_count": len(request.videos)}

@app.post("/api/abort")
async def abort_jobs():
    task_manager.abort_all()
    return {"status": "aborted"}

@app.get("/api/events/{file_id:path}")
async def sse_endpoint(file_id: str):
    return StreamingResponse(
        event_manager.subscribe(file_id),
        media_type="text/event-stream"
    )