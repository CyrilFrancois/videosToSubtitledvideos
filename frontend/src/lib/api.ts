const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * API Service Layer
 * Updated to support the rich JSON payload and direct "startJob" naming.
 */
export const api = {
  // 1. Fetch directory structure
  async scanFolder(path: string = "/data") {
    const url = `${API_BASE_URL}/api/scan?target_path=${encodeURIComponent(path)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to scan media library');
    }

    return response.json();
  },

  /**
   * 2. The New Start Job
   * This matches the call in page.tsx: api.startJob(payload)
   * Receives the "perfect" payload directly.
   */
  async startJob(payload: any) {
    const url = `${API_BASE_URL}/api/process`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to start the processing job');
    }

    return response.json();
  },

  // 3. Global Kill Switch: Abort the entire queue
  async abortAll() {
    const url = `${API_BASE_URL}/api/abort`;
    
    const response = await fetch(url, { 
      method: 'POST' 
    });

    if (!response.ok) {
      throw new Error('Failed to trigger global abort');
    }

    return response.json();
  },

  // 4. Cancel/Abort proxy (Used by VideoList components)
  async cancelJob(fileId: string) {
    // Currently, we use the global abort for simplicity, 
    // or you can implement a specific delete route in FastAPI.
    return this.abortAll();
  },

  // 5. Upload External Subtitle
  async uploadSubtitle(file: File, targetName: string, destinationPath: string) {
    const url = `${API_BASE_URL}/api/subtitles/upload`;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetName', targetName);
    formData.append('destinationPath', destinationPath);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to upload subtitle file');
    }

    return response.json();
  }
};

// Ensure individual exports match the new method names
export const { uploadSubtitle, startJob, abortAll, cancelJob, scanFolder } = api;