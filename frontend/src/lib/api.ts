const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * API Service Layer
 * Updated to handle Smart Subtitle Detection metadata and Hybrid Workflow settings.
 */
export const api = {
  // 1. Fetch directory structure
  // CHANGED: Method is now GET to match the backend's resource retrieval pattern
  async scanFolder(path: string = "/data", recursive: boolean = true) {
    const url = `${API_BASE_URL}/api/scan?target_path=${encodeURIComponent(path)}`;
    
    const response = await fetch(url, {
      method: 'GET', // Changed from POST
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to scan media library');
    }

    return response.json();
  },

  // 2. Start processing with Enhanced Settings
  // Now sends WorkflowMode, SourceLang, and multiple TargetLanguages
  async startProcessing(fileIds: string[], globalSettings: any) {
    const url = `${API_BASE_URL}/api/process`;
    
    // Construct the payload to match the backend's ProcessRequest model
    const payload = {
      fileIds,
      sourceLang: globalSettings.sourceLang?.[0] || "auto",
      targetLanguages: globalSettings.targetLanguages || ["fr"],
      workflowMode: globalSettings.workflowMode || "hybrid",
      shouldRemoveOriginal: globalSettings.shouldRemoveOriginal || false,
      shouldMux: true, // Default to true for the 'Lexi-Stream' experience
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
  }
};