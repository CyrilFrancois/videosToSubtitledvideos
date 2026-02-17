export type SSEEvent = {
  type: 'status' | 'log';
  fileId: string;
  // Shared field: backend uses 'message' for both log text and status descriptions
  message: string; 
  // Status-specific
  status?: string;
  progress?: number;
  // Log-specific (Backend sends level as a string)
  level?: string;
};

/**
 * Creates an EventSource connection to the backend for a specific file.
 * Automatically handles JSON parsing and error cleanup.
 */
export const createSSEConnection = (
  fileId: string,
  onMessage: (data: SSEEvent) => void,
  onError?: (error: Event) => void
) => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  // 1. Prepare the URL. 
  // Note: Backend endpoint is @app.get("/api/events/{file_id:path}")
  // We encode the fileId because it's a file path containing slashes.
  const encodedFileId = encodeURIComponent(fileId);
  const url = `${API_BASE_URL}/api/events/${encodedFileId}`;

  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data: SSEEvent = JSON.parse(event.data);
      
      // Validation: Ensure we have the minimum required fields
      if (data && data.type) {
        onMessage(data);
      }
    } catch (err) {
      console.error("❌ SSE Parse Error:", err, "Raw data:", event.data);
    }
  };

  eventSource.onerror = (error) => {
    console.error(`📡 SSE Connection Error for ${fileId}:`, error);
    if (onError) onError(error);
    
    // If the connection closes (done) or fails (server down), 
    // EventSource usually tries to reconnect. 
    // If the server sends a 404 or 500, we may want to close it manually.
    if (eventSource.readyState === EventSource.CLOSED) {
      console.log("📡 SSE Connection closed.");
    }
  };

  return eventSource;
};