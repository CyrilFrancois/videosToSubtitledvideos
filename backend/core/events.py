import asyncio
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("SubStudio.Events")

class SSELogHandler(logging.Handler):
    """
    Intercepts standard Python logs and pipes them into the EventManager.
    This is what makes 'logger.info("Starting...")' appear in the React terminal.
    """
    def __init__(self, event_manager: 'EventManager', file_id: str):
        super().__init__()
        self.event_manager = event_manager
        self.file_id = file_id

    def emit(self, record):
        try:
            # Avoid infinite loop: don't bridge logs coming from the event system itself
            if "SubStudio.Events" in record.name:
                return
                
            log_message = self.format(record)
            # Send to the broadcaster
            self.event_manager.emit_log(self.file_id, log_message, record.levelname)
        except Exception:
            self.handleError(record)

class EventManager:
    """
    Manages Server-Sent Events (SSE) subscriptions.
    Each file_id gets its own dedicated broadcast channel.
    """
    def __init__(self):
        self.listeners: Dict[str, List[asyncio.Queue]] = {}
        # Stores the last known status to show immediately on reconnect
        self.state_cache: Dict[str, Dict[str, Any]] = {}

    def emit(self, file_id: str, status: str, progress: int, message: str):
        """Updates the UI progress bar and status text."""
        data = {
            "type": "status",
            "fileId": file_id,
            "status": status,
            "progress": progress,
            "message": message
        }
        self.state_cache[file_id] = data
        self._broadcast(file_id, data)

    def emit_log(self, file_id: str, message: str, level: str = "INFO"):
        """Sends a raw string to the frontend's console/terminal component."""
        data = {
            "type": "log",
            "fileId": file_id,
            "level": level,
            "message": message
        }
        self._broadcast(file_id, data)

    def _broadcast(self, file_id: str, data: Dict[str, Any]):
        """Pushes data to all active browser tabs listening to this file_id."""
        if file_id in self.listeners:
            for queue in self.listeners[file_id]:
                # Non-blocking put; if the queue is full, we skip to prevent lag
                try:
                    queue.put_nowait(data)
                except asyncio.QueueFull:
                    pass

    async def subscribe(self, file_id: str):
        """The generator function used by FastAPI StreamingResponse."""
        queue = asyncio.Queue(maxsize=100)
        
        # 1. Send immediate state if we have it
        if file_id in self.state_cache:
            yield f"data: {json.dumps(self.state_cache[file_id])}\n\n"

        # 2. Register this listener
        if file_id not in self.listeners:
            self.listeners[file_id] = []
        self.listeners[file_id].append(queue)
        
        logger.debug(f"🔌 New SSE subscriber for: {file_id}")

        try:
            while True:
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.CancelledError:
            logger.debug(f"🔌 SSE subscriber disconnected: {file_id}")
        finally:
            if file_id in self.listeners:
                self.listeners[file_id].remove(queue)
                if not self.listeners[file_id]:
                    del self.listeners[file_id]

# Global Singleton
event_manager = EventManager()

def setup_logging_bridge(file_id: str) -> SSELogHandler:
    """
    Attaches the logger to the SSE stream. 
    Usage in main.py: handler = setup_logging_bridge(fid) -> ... -> root.removeHandler(handler)
    """
    root_logger = logging.getLogger()
    handler = SSELogHandler(event_manager, file_id)
    
    # Clean format for the UI Terminal
    handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
    
    root_logger.addHandler(handler)
    return handler