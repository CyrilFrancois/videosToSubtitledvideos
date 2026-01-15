"use client";

import React from 'react';
import VideoCard from './VideoCard';
import { Ghost } from 'lucide-react';

interface VideoListProps {
  videos: any[]; // 'videos' now contains mixed folder and file objects
  onStartJob: (id: string) => void;
  onCancelJob: (id: string) => void;
  onNavigate: (path: string) => void; // New prop for folder navigation
}

export default function VideoList({ videos, onStartJob, onCancelJob, onNavigate }: VideoListProps) {
  if (videos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-20 border-2 border-dashed border-white/5 rounded-3xl">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-gray-600 mb-6">
          <Ghost size={40} />
        </div>
        <h3 className="text-xl font-bold text-gray-300">Folder is empty</h3>
        <p className="text-gray-500 max-w-xs mt-2">
          This directory doesn't contain any compatible video files or subfolders.
        </p>
      </div>
    );
  }

  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-3 pb-20">
        {videos.map((item) => (
          <VideoCard 
            key={item.id} 
            video={item} 
            onStart={onStartJob}
            onCancel={onCancelJob}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );
}