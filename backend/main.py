import asyncio
import os
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path

# Import your custom modules
from core.scanner import VideoScanner
from core.transcriber import VideoTranscriber
from core.translator import SubtitleTranslator
from core.muxer import VideoMuxer

# --- 1. DEFINE DATA MODELS ---
class ScanRequest(BaseModel):
    path: str = "/data"
    recursive: bool = True

class ProcessRequest(BaseModel):
    fileIds: List[str]
    targetLanguage: str = "French"
    shouldRemoveOriginal: bool = False

# --- 2. INITIALIZATION ---
app = FastAPI()

# ENABLE CORS (CRITICAL FOR FRONTEND ACCESS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock Event Manager
try:
    from core.events import event_manager
except ImportError:
    class MockEventManager:
        def emit(self, fid, status, progress, msg): 
            print(f"[{fid}] {status} ({progress}%): {msg}")
    event_manager = MockEventManager()

# Initialize AI Tools
transcriber = VideoTranscriber(model_size="base")
translator = SubtitleTranslator() 
muxer = VideoMuxer()

# Simple In-Memory Cache for files found during scan
active_files_cache = {}

# --- 3. PIPELINE LOGIC ---
async def run_pipeline(file_ids: List[str], settings: ProcessRequest):
    for fid in file_ids:
        video = active_files_cache.get(fid)
        if not video: continue

        try:
            video_path = video['filePath']
            
            # STEP 1: Transcribe
            event_manager.emit(fid, "transcribing", 0, "Initializing Whisper...")
            srt_content = transcriber.transcribe(video_path, fid, event_manager.emit)
            
            temp_srt = f"/tmp/{fid}_original.srt"
            with open(temp_srt, "w", encoding="utf-8") as f:
                f.write(srt_content)

            # STEP 2: Translate
            event_manager.emit(fid, "translating", 0, f"Translating to {settings.targetLanguage}...")
            translated_srt = translator.translate_srt(
                srt_content, settings.targetLanguage, fid, event_manager.emit
            )
            
            translated_srt_path = f"/tmp/{fid}_translated.srt"
            with open(translated_srt_path, "w", encoding="utf-8") as f:
                f.write(translated_srt)

            # STEP 3: Mux
            event_manager.emit(fid, "muxing", 0, "Muxing final video...")
            final_output = muxer.mux_subtitles(
                video_path, translated_srt_path, settings.targetLanguage, fid, event_manager.emit
            )

            # STEP 4: Finish
            event_manager.emit(fid, "done", 100, f"Saved: {os.path.basename(final_output)}")
            
            for temp in [temp_srt, translated_srt_path]:
                if os.path.exists(temp): os.remove(temp)

        except Exception as e:
            print(f"Pipeline Error for {fid}: {e}")
            event_manager.emit(fid, "error", 0, f"Error: {str(e)}")

# --- 4. API ENDPOINTS ---

@app.post("/api/scan") # Updated to match frontend URL
async def scan_library(target_path: Optional[str] = "/data"):
    """Scans the mounted /data folder for videos."""
    # Ensure we stay within the /data directory for security
    if not target_path.startswith("/data"):
        target_path = "/data"
        
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Path not found inside container")

    scanner = VideoScanner(target_path)
    # scanner.scan should return list of dicts with 'id', 'filePath', 'fileName', etc.
    files = scanner.scan(recursive=True)
    
    # Update cache so pipeline can find file paths by ID later
    for f in files:
        active_files_cache[f['id']] = f
        
    return {
        "currentPath": target_path, 
        "files": files
    }

@app.post("/api/process")
async def start_processing(request: ProcessRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_pipeline, request.fileIds, request)
    return {"status": "started", "count": len(request.fileIds)}