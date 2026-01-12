const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = {
  // Trigger a scan of a directory
  async scanFolder(path: string, recursive: boolean = false): Promise<ScanResponse> {
    const response = await fetch(`${API_BASE_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, recursive }),
    });
    if (!response.ok) throw new Error('Failed to scan folder');
    return response.json();
  },

  // Start processing a specific list of files
  async startProcessing(fileIds: string[], globalSettings: any) {
    const response = await fetch(`${API_BASE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds, ...globalSettings }),
    });
    return response.json();
  },

  // Cancel a running job
  async cancelJob(fileId: string) {
    return fetch(`${API_BASE_URL}/cancel/${fileId}`, { method: 'DELETE' });
  }
};