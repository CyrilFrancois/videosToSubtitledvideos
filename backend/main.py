import asyncio
import json
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="AI Media Suite Backend")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global event queue for SSE (Server-Sent Events)
class EventManager:
    def __init__(self):
        self.listeners = []

    async def subscribe(self):
        queue = asyncio.Queue()
        self.listeners.append(queue)
        try:
            while True:
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
        finally:
            self.listeners.remove(queue)

    def emit(self, file_id: str, status: str, progress: float, task: str = ""):
        event_data = {
            "fileId": file_id,
            "status": status,
            "progress": progress,
            "currentTask": task
        }
        for queue in self.listeners:
            queue.put_nowait(event_data)

event_manager = EventManager()

# --- API MODELS ---
class ScanRequest(BaseModel):
    path: str
    recursive: bool = True

class ProcessRequest(BaseModel):
    fileIds: List[str]
    targetLanguage: str
    shouldMux: bool
    shouldRemoveOriginal: bool

# --- ENDPOINTS ---

@app.get("/events")
async def events_handler():
    """Streaming endpoint for real-time UI updates"""
    return StreamingResponse(event_manager.subscribe(), media_type="text/event-stream")

@app.post("/scan")
async def scan_directory(request: ScanRequest):
    """
    Triggers the scanner logic.
    For now, returning a placeholder to confirm connectivity.
    """
    from core.scanner import VideoScanner
    scanner = VideoScanner(request.path)
    files = scanner.scan(recursive=request.recursive)
    return {"rootPath": request.path, "files": files}

@app.post("/process")
async def start_processing(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Starts the AI pipeline in the background"""
    # background_tasks.add_task(your_pipeline_function, request, event_manager)
    return {"message": "Processing started", "jobCount": len(request.fileIds)}

@app.get("/")
def read_root():
    return {"status": "AI Media Suite API is running"}