export type SSEEvent = {
  fileId: string;
  status: string;
  progress: number;
  currentTask?: string;
};

export const createSSEConnection = (
  onMessage: (data: SSEEvent) => void,
  onError?: (error: Event) => void
) => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const eventSource = new EventSource(`${API_BASE_URL}/events`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  if (onError) {
    eventSource.onerror = onError;
  }

  return eventSource;
};