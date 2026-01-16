const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * API Service Layer
 * Updated to handle Smart Subtitle Detection metadata, 
 * Hybrid Workflow settings, and Manual Subtitle Uploads.
 */
export const api = {
  // 1. Fetch directory structure
  async scanFolder(path: string = "/data", recursive: boolean = true) {
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

  // 2. Start processing with Enhanced Settings
  async startProcessing(fileIds: string[], globalSettings: any) {
    const url = `${API_BASE_URL}/api/process`;
    
    const payload = {
      fileIds,
      sourceLang: globalSettings.sourceLang?.[0] || "auto",
      targetLanguages: globalSettings.targetLanguages || ["fr"],
      workflowMode: globalSettings.workflowMode || "hybrid",
      shouldRemoveOriginal: globalSettings.shouldRemoveOriginal || false,
      shouldMux: true, 
      modelSize: "base" 
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to start AI processing pipeline');
    }

    return response.json();
  },

  // 3. Cancel a running job
  async cancelJob(fileId: string) {
    const url = `${API_BASE_URL}/api/cancel/${encodeURIComponent(fileId)}`;
    
    const response = await fetch(url, { 
      method: 'DELETE' 
    });

    if (!response.ok) {
      throw new Error('Failed to cancel the requested job');
    }

    return response.json();
  },

  /**
   * 4. Upload External Subtitle
   * Sends the .srt file to the Python backend to be saved next to the video.
   */
  async uploadSubtitle(file: File, targetName: string, destinationPath: string) {
    const url = `${API_BASE_URL}/api/subtitles/upload`;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetName', targetName);
    formData.append('destinationPath', destinationPath);

    const response = await fetch(url, {
      method: 'POST',
      // Note: Do NOT set Content-Type header when sending FormData; 
      // the browser will automatically set it to 'multipart/form-data' with the correct boundary.
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to upload subtitle file');
    }

    return response.json();
  }
};

// Export individual function for compatibility with the VideoCard.tsx import
export const uploadSubtitle = api.uploadSubtitle;