import asyncio
import os
import shutil
from fastapi import FastAPI, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect, Query, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from pathlib import Path

# Import custom modules
from core.scanner import VideoScanner
from core.transcriber import VideoTranscriber
from core.subtitle_processor import SubtitleProcessor
from core.translator import SubtitleTranslator
from core.muxer import VideoMuxer

# --- 1. DEFINE DATA MODELS ---
class ProcessRequest(BaseModel):
    fileIds: List[str]
    sourceLang: Optional[str] = "auto"
    targetLanguages: List[str] = ["fr"]
    workflowMode: str = "hybrid"  # "hybrid" or "force_ai"
    shouldRemoveOriginal: bool = False
    shouldMux: bool = True
    modelSize: str = "base"

# --- 2. INITIALIZATION ---
app = FastAPI()

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize scanner with the base path
scanner = VideoScanner(base_path="/data")

# Event Manager setup
try:
    from core.events import event_manager
except ImportError:
    class MockEventManager:
        def emit(self, fid, status, progress, msg): 
            print(f"[{fid}] {status} ({progress}%): {msg}")
    event_manager = MockEventManager()

# Initialize Engine Components
transcriber = VideoTranscriber(model_size="base")
translator = SubtitleTranslator() 
muxer = VideoMuxer()
processor = SubtitleProcessor()

# In-Memory Cache for files found during scan
active_files_cache = {}

# --- 3. PIPELINE LOGIC ---
async def run_pipeline(file_ids: List[str], settings: ProcessRequest):
    for fid in file_ids:
        video = active_files_cache.get(fid)
        if not video:
            event_manager.emit(fid, "error", 0, "File not found in session cache. Please re-scan.")
            continue

        try:
            video_path = video['filePath']
            sub_info = video.get('subtitleInfo', {})
            srt_content = ""
            
            # --- PHASE 1: SUBTITLE ACQUISITION ---
            if settings.workflowMode == "hybrid" and sub_info.get("hasSubtitles"):
                event_manager.emit(fid, "processing", 10, f"Loading detected {sub_info.get('subType')} subtitles...")
                srt_content = processor.load_existing_subtitles(video)
                
                if not srt_content:
                    event_manager.emit(fid, "processing", 15, "Existing subtitles unreadable. Falling back to AI...")
                    srt_content = transcriber.transcribe(video_path, fid, event_manager.emit)
            else:
                event_manager.emit(fid, "processing", 10, f"AI Transcribing with Whisper ({settings.modelSize})...")
                srt_content = transcriber.transcribe(video_path, fid, event_manager.emit)

            if not srt_content:
                raise Exception("Failed to acquire source subtitles.")

            # --- PHASE 2: TRANSLATION ---
            translated_srts = {}
            for i, lang in enumerate(settings.targetLanguages):
                progress = 40 + int((i / len(settings.targetLanguages)) * 30)
                event_manager.emit(fid, "processing", progress, f"Translating to {lang.upper()}...")
                translated_srts[lang] = translator.translate(srt_content, lang)

            # --- PHASE 3: MUXING / EXPORT ---
            if settings.shouldMux:
                event_manager.emit(fid, "processing", 85, "Muxing final video container...")
                output_path = muxer.mux(video_path, translated_srts)
                event_manager.emit(fid, "done", 100, f"Success! Output: {os.path.basename(output_path)}")
            else:
                event_manager.emit(fid, "processing", 90, "Saving external SRT files...")
                event_manager.emit(fid, "done", 100, "Success! Sidecar SRTs created.")
            
        except Exception as e:
            event_manager.emit(fid, "error", 0, f"Pipeline Error: {str(e)}")

# --- 4. API ENDPOINTS ---

@app.get("/api/scan")
async def scan_library(target_path: str = Query("/data")):
    # Security: Ensure we stay within the data mount
    if not target_path.startswith("/data"):
        target_path = "/data"
        
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"Path {target_path} not found")

    items = scanner.scan(target_path=target_path, recursive=True)
    
    def update_cache_recursive(nodes):
        for node in nodes:
            if not node.get('is_directory'):
                active_files_cache[node['id']] = node
            elif node.get('children'):
                update_cache_recursive(node['children'])

    update_cache_recursive(items)
    
    return {
        "status": "success",
        "currentPath": target_path, 
        "files": items
    }

@app.post("/api/subtitles/upload")
async def upload_subtitle(
    file: UploadFile = File(...),
    targetName: str = Form(...),
    destinationPath: str = Form(...)
):
    """
    Receives an SRT file and saves it in the specified directory.
    If the file exists, appends _1, _2, etc.
    """
    try:
        # Security: Validation
        if not destinationPath.startswith("/data"):
            raise HTTPException(status_code=403, detail="Forbidden: Path must be within /data")
        
        if not os.path.exists(destinationPath):
            raise HTTPException(status_code=404, detail="Destination directory does not exist")

        # File Naming Logic
        base, ext = os.path.splitext(targetName)
        final_file_path = os.path.join(destinationPath, targetName)
        
        counter = 1
        while os.path.exists(final_file_path):
            final_file_path = os.path.join(destinationPath, f"{base}_{counter}{ext}")
            counter += 1

        # Save File
        with open(final_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {
            "status": "success",
            "savedPath": final_file_path,
            "fileName": os.path.basename(final_file_path)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/api/process")
async def start_processing(request: ProcessRequest, background_tasks: BackgroundTasks):
    if not request.fileIds:
        raise HTTPException(status_code=400, detail="No file IDs provided")
    
    background_tasks.add_task(run_pipeline, request.fileIds, request)
    return {"status": "started", "count": len(request.fileIds)}

@app.websocket("/ws/status")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass

@app.delete("/api/cancel/{file_id}")
async def cancel_job(file_id: str):
    return {"status": "cancelled", "id": file_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)