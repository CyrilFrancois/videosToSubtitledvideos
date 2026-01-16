import asyncio
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger("SubStudio.Events")

class EventManager:
    def __init__(self):
        # file_id -> list of queues
        self.listeners: Dict[str, List[asyncio.Queue]] = {}
        # NEW: file_id -> last sent data (Cache)
        self.last_event_cache: Dict[str, Dict[str, Any]] = {}

    def emit(self, file_id: str, status: str, progress: int, message: str):
        data = {
            "fileId": file_id,
            "status": status,
            "progress": progress,
            "message": message
        }
        
        # Store in cache so new subscribers get the current state immediately
        self.last_event_cache[file_id] = data
        
        logger.info(f"📡 [EVENT] {file_id} -> {status} ({progress}%) : {message}")
        
        if file_id in self.listeners:
            for queue in self.listeners[file_id]:
                queue.put_nowait(data)

    async def subscribe(self, file_id: str):
        queue = asyncio.Queue()
        
        # 1. If we have a cached state for this file, send it immediately
        if file_id in self.last_event_cache:
            queue.put_nowait(self.last_event_cache[file_id])

        if file_id not in self.listeners:
            self.listeners[file_id] = []
        
        self.listeners[file_id].append(queue)
        
        try:
            while True:
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.CancelledError:
            if file_id in self.listeners:
                self.listeners[file_id].remove(queue)
                if not self.listeners[file_id]:
                    del self.listeners[file_id]
                    # Optional: Clean up cache after everyone disconnects
                    # self.last_event_cache.pop(file_id, None) 
            logger.info(f"🔌 [SSE] Listener disconnected for {file_id}")

# Global instance
event_manager = EventManager()