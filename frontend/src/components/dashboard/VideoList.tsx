"use client";

import React from 'react';
import { VideoFile } from '@/lib/types';
import VideoCard from './VideoCard';
import { Ghost } from 'lucide-react';

interface VideoListProps {
  videos: VideoFile[];
  onStartJob: (id: string) => void;
  onCancelJob: (id: string) => void;
}

export default function VideoList({ videos, onStartJob, onCancelJob }: VideoListProps) {
  if (videos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-gray-600 mb-6">
          <Ghost size={40} />
        </div>
        <h3 className="text-xl font-bold text-gray-300">No videos found</h3>
        <p className="text-gray-500 max-w-xs mt-2">
          Select a folder from the sidebar to begin scanning your media library.
        </p>
      </div>
    );
  }

  return (
    <section className="flex-1 overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-4 pb-20">
        {videos.map((video) => (
          <VideoCard 
            key={video.id} 
            video={video} 
            onStart={onStartJob}
            onCancel={onCancelJob}
          />
        ))}
      </div>
    </section>
  );
}