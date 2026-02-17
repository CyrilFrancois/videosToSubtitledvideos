import asyncio
import json
import logging
from typing import Dict, Any, List

# This logger is just for the internal event system logs
logger = logging.getLogger("SubStudio.Events")

class SSELogHandler(logging.Handler):
    """
    Custom logging handler that pipes Python logs into the EventManager
    to be sent via SSE to the frontend.
    """
    def __init__(self, event_manager, file_id_context):
        super().__init__()
        self.event_manager = event_manager
        self.current_file_id = file_id_context 

    def emit(self, record):
        try:
            # We skip internal SSE logs to avoid infinite loops
            if record.name == "SubStudio.Events":
                return
                
            log_entry = self.format(record)
            if self.current_file_id:
                # Direct injection into the SSE broadcaster
                self.event_manager.emit_log(self.current_file_id, log_entry, record.levelname)
        except Exception:
            self.handleError(record)

class EventManager:
    def __init__(self):
        self.listeners: Dict[str, List[asyncio.Queue]] = {}
        self.last_event_cache: Dict[str, Dict[str, Any]] = {}

    def emit(self, file_id: str, status: str, progress: int, message: str):
        """Emits standard UI progress updates."""
        data = {
            "type": "status",
            "fileId": file_id,
            "status": status,
            "progress": progress,
            "message": message
        }
        self._broadcast(file_id, data)

    def emit_log(self, file_id: str, log_message: str, level: str = "INFO"):
        """Emits raw log lines to the frontend terminal."""
        data = {
            "type": "log",
            "fileId": file_id,
            "level": level,
            "message": log_message
        }
        self._broadcast(file_id, data)

    def _broadcast(self, file_id: str, data: Dict[str, Any]):
        if data.get("type") == "status":
            self.last_event_cache[file_id] = data
            
        if file_id in self.listeners:
            for queue in self.listeners[file_id]:
                # Non-blocking put
                queue.put_nowait(data)

    async def subscribe(self, file_id: str):
        queue = asyncio.Queue()
        
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

# Global instance
event_manager = EventManager()

def setup_logging_bridge(file_id: str):
    """
    Connects ALL backend logs to the SSE stream for a specific file.
    """
    # 1. Get the ROOT logger of the entire app
    # If your other files use logging.getLogger(__name__), 
    # they will all propagate up to the root.
    root_logger = logging.getLogger() 
    
    # 2. Attach our bridge
    handler = SSELogHandler(event_manager, file_id)
    
    # 3. Use a clean format for the frontend terminal
    handler.setFormatter(logging.Formatter('%(name)s | %(levelname)s | %(message)s'))
    
    root_logger.addHandler(handler)
    
    # 4. Return the handler so main.py can remove it after the job
    return handler