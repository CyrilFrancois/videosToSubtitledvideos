const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * API Service Layer
 * Handles communication between the Next.js frontend and the FastAPI backend.
 */
export const api = {
  // 1. Trigger a scan of a directory
  // Note: target_path is sent as a query parameter to match main.py: scan_library(target_path: str)
  async scanFolder(path: string = "/data", recursive: boolean = true) {
    const url = `${API_BASE_URL}/api/scan?target_path=${encodeURIComponent(path)}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to scan media library');
    }

    return response.json();
  },

  // 2. Start processing a specific list of files
  // Note: Matches ProcessRequest model in main.py
  async startProcessing(fileIds: string[], globalSettings: any) {
    const url = `${API_BASE_URL}/api/process`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fileIds, 
        targetLanguage: globalSettings.targetLanguage || "French",
        shouldRemoveOriginal: globalSettings.shouldRemoveOriginal || false
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start AI processing pipeline');
    }

    return response.json();
  },

  // 3. Cancel a running job
  async cancelJob(fileId: string) {
    const url = `${API_BASE_URL}/api/cancel/${fileId}`;
    
    const response = await fetch(url, { 
      method: 'DELETE' 
    });

    if (!response.ok) {
      throw new Error('Failed to cancel the requested job');
    }

    return response.json();
  }
};