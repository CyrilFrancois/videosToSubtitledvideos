"use client";

import { useEffect } from 'react';
import { VideoFile } from '@/lib/types';

export function useVideoStatus(
  videos: VideoFile[], 
  setVideos: React.Dispatch<React.SetStateAction<VideoFile[]>>
) {
  useEffect(() => {
    // This is where your EventSource (SSE) or WebSocket logic goes
    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/ws/status`);

    eventSource.onmessage = (event) => {
      const updatedVideo = JSON.parse(event.data);
      setVideos((prevVideos) =>
        prevVideos.map((v) => (v.id === updatedVideo.id ? updatedVideo : v))
      );
    };

    return () => eventSource.close();
  }, [setVideos]);
}