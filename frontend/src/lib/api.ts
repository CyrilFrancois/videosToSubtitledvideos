const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * API Service Layer
 * Optimized for SubStudio's "Last Input Wins" state management.
 */
export const api = {
  // 1. Fetch directory structure
  async scanFolder(path: string = "/data", recursive: boolean = true) {
    const params = new URLSearchParams({
      target_path: path,
      recursive: String(recursive)
    });
    
    const response = await fetch(`${API_BASE_URL}/api/scan?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    return handleResponse(response, 'Failed to scan media library');
  },

  /**
   * 2. Start Processing Job
   * Sends the unified payload (Sidebar globals + Card overrides)
   */
  async startJob(payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return handleResponse(response, 'Failed to start the processing job');
  },

  // 3. Global Kill Switch
  async abortAll() {
    const response = await fetch(`${API_BASE_URL}/api/abort`, { 
      method: 'POST' 
    });

    return handleResponse(response, 'Failed to trigger global abort');
  },

  // 4. Cancel/Abort specific file
  async cancelJob(fileId: string) {
    const response = await fetch(`${API_BASE_URL}/api/abort/${encodeURIComponent(fileId)}`, { 
      method: 'DELETE' 
    });
    
    // Fallback to global abort if the specific route doesn't exist yet
    if (response.status === 404) return this.abortAll();
    
    return handleResponse(response, 'Failed to cancel specific job');
  },

  /**
   * 5. Upload External Subtitle
   * Note: We do NOT set Content-Type header here. 
   * The browser automatically sets it to multipart/form-data with the correct boundary.
   */
  async uploadSubtitle(file: File, targetName: string, destinationPath: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetName', targetName);
    formData.append('destinationPath', destinationPath);

    const response = await fetch(`${API_BASE_URL}/api/subtitles/upload`, {
      method: 'POST',
      body: formData, // Browser handles boundary headers
    });

    return handleResponse(response, 'Failed to upload subtitle file');
  }
};

/**
 * Generic Error Handling Helper
 */
async function handleResponse(response: Response, defaultError: string) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || defaultError);
  }
  return response.json();
}

// Named exports for convenience
export const { uploadSubtitle, startJob, abortAll, cancelJob, scanFolder } = api;