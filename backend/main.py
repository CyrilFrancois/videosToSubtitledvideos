import asyncio
import os
from fastapi import FastAPI, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect, Query
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
class ProcessRequest(BaseModel):
    fileIds: List[str]
    targetLanguage: str = "French"
    shouldRemoveOriginal: bool = False

# --- 2. INITIALIZATION ---
app = FastAPI()

# ENABLE CORS (CRITICAL FOR FRONTEND ACCESS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Specific origin is safer than "*"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock Event Manager or Real Event Manager
try:
    from core.events import event_manager
except ImportError:
    class MockEventManager:
        def emit(self, fid, status, progress, msg): 
            print(f"[{fid}] {status} ({progress}%): {msg}")
    event_manager = MockEventManager()

# Initialize AI Tools
# Note: Ensure these models are loaded once at startup
transcriber = VideoTranscriber(model_size="base")
translator = SubtitleTranslator() 
muxer = VideoMuxer()

# Simple In-Memory Cache for files found during scan
active_files_cache = {}

# --- 3. PIPELINE LOGIC ---
async def run_pipeline(file_ids: List[str], settings: ProcessRequest):
    for fid in file_ids:
        video = active_files_cache.get(fid)
        if not video:
            print(f"File ID {fid} not found in cache.")
            continue

        try:
            video_path = video['filePath']
            
            # STEP 1: Transcribe
            event_manager.emit(fid, "processing", 10, "Initializing Whisper...")
            srt_content = transcriber.transcribe(video_path, fid, event_manager.emit)
            
            temp_srt = f"/tmp/{fid}_original.srt"
            with open(temp_srt, "w", encoding="utf-8") as f:
                f.write(srt_content)

            # STEP 2: Translate
            event_manager.emit(fid, "processing", 40, f"Translating to {settings.targetLanguage}...")
            translated_srt = translator.translate_srt(
                srt_content, settings.targetLanguage, fid, event_manager.emit
            )
            
            translated_srt_path = f"/tmp/{fid}_translated.srt"
            with open(translated_srt_path, "w", encoding="utf-8") as f:
                f.write(translated_srt)

            # STEP 3: Mux
            event_manager.emit(fid, "processing", 80, "Muxing final video...")
            final_output = muxer.mux_subtitles(
                video_path, translated_srt_path, settings.targetLanguage, fid, event_manager.emit
            )

            # STEP 4: Finish
            event_manager.emit(fid, "done", 100, f"Saved: {os.path.basename(final_output)}")
            
            # Cleanup temp files
            for temp in [temp_srt, translated_srt_path]:
                if os.path.exists(temp): os.remove(temp)

        except Exception as e:
            print(f"Pipeline Error for {fid}: {e}")
            event_manager.emit(fid, "error", 0, f"Error: {str(e)}")

# --- 4. API ENDPOINTS ---

@app.post("/api/scan")
async def scan_library(target_path: str = Query("/data")):
    """
    Scans the provided directory for videos and subfolders.
    """
    # Security: Ensure we stay within the /data volume
    if not target_path.startswith("/data"):
        target_path = "/data"
        
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"Path {target_path} not found")

    # Initialize scanner with the base path
    scanner = VideoScanner(base_path="/data")
    
    # Pass target_path to the scan method. 
    # Logic in scanner.py should handle subfolders and files.
    items = scanner.scan(target_path=target_path, recursive=False)
    
    # Update cache so we can find filePaths later during processing
    for item in items:
        if not item.get('is_directory'):
            active_files_cache[item['id']] = item
        
    return {
        "status": "success",
        "currentPath": target_path, 
        "files": items
    }

@app.post("/api/process")
async def start_processing(request: ProcessRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_pipeline, request.fileIds, request)
    return {"status": "started", "count": len(request.fileIds)}

@app.websocket("/ws/status")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Keep-alive loop
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        print("WebSocket disconnected")

@app.delete("/api/cancel/{file_id}")
async def cancel_job(file_id: str):
    # Future implementation for cancellation logic
    return {"status": "cancelled", "id": file_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)