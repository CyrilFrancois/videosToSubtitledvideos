import asyncio
import os
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional

# Import your custom modules
from core.scanner import VideoScanner
from core.transcriber import VideoTranscriber
from core.translator import SubtitleTranslator
from core.muxer import VideoMuxer

# --- 1. DEFINE DATA MODELS ---
# These must be defined BEFORE the functions that use them

class ScanRequest(BaseModel):
    path: str
    recursive: bool = True

class ProcessRequest(BaseModel):
    fileIds: List[str]
    targetLanguage: str = "English"
    shouldRemoveOriginal: bool = False

# --- 2. INITIALIZATION ---

app = FastAPI()

# Assuming you have an event_manager in your core to handle progress
# If you don't have one yet, we'll need to create a simple mock for it
try:
    from core.events import event_manager
except ImportError:
    # Fallback mock if event_manager isn't built yet
    class MockEventManager:
        def emit(self, fid, status, progress, msg): 
            print(f"[{fid}] {status} ({progress}%): {msg}")
    event_manager = MockEventManager()

transcriber = VideoTranscriber(model_size="base")
translator = SubtitleTranslator() 
muxer = VideoMuxer()

active_files_cache = {}

# --- 3. PIPELINE LOGIC ---

async def run_pipeline(file_ids: List[str], settings: ProcessRequest):
    """The master sequence that moves each file through the AI pipeline."""
    for fid in file_ids:
        video = active_files_cache.get(fid)
        if not video:
            continue

        try:
            video_path = video['filePath']
            
            # STEP 1: Transcribe
            event_manager.emit(fid, "transcribing", 0, "Initializing Whisper...")
            srt_content = transcriber.transcribe(video_path, fid, event_manager.emit)
            
            # Save temporary original SRT
            temp_srt = f"{fid}_original.srt"
            with open(temp_srt, "w", encoding="utf-8") as f:
                f.write(srt_content)

            # STEP 2: Translate
            event_manager.emit(fid, "translating", 0, f"Translating to {settings.targetLanguage}...")
            translated_srt = translator.translate_srt(
                srt_content, settings.targetLanguage, fid, event_manager.emit
            )
            
            # Save temporary translated SRT
            translated_srt_path = f"{fid}_translated.srt"
            with open(translated_srt_path, "w", encoding="utf-8") as f:
                f.write(translated_srt)

            # STEP 3: Mux
            event_manager.emit(fid, "muxing", 0, "Muxing final video...")
            final_output = muxer.mux_subtitles(
                video_path, translated_srt_path, settings.targetLanguage, fid, event_manager.emit
            )

            # STEP 4: Finish
            event_manager.emit(fid, "done", 100, f"Saved as {os.path.basename(final_output)}")
            
            # Cleanup temp files
            for temp in [temp_srt, translated_srt_path]:
                if os.path.exists(temp): os.remove(temp)

        except Exception as e:
            print(f"Pipeline Error for {fid}: {e}")
            event_manager.emit(fid, "error", 0, f"Error: {str(e)}")

# --- 4. API ENDPOINTS ---

@app.post("/scan")
async def scan_directory(request: ScanRequest):
    scanner = VideoScanner(request.path)
    files = scanner.scan(recursive=request.recursive)
    
    for f in files:
        active_files_cache[f['id']] = f
        
    return {"rootPath": request.path, "files": files}

@app.post("/process")
async def start_processing(request: ProcessRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_pipeline, request.fileIds, request)
    return {"status": "started", "count": len(request.fileIds)}