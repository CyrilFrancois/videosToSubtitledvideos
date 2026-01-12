"use client";

import React from 'react';
import { VideoFile } from '@/lib/types';

interface GlobalProgressProps {
  videos: VideoFile[];
}

export default function GlobalProgress({ videos }: GlobalProgressProps) {
  const total = videos.length;
  if (total === 0) return null;

  const completed = videos.filter(v => v.status === 'done').length;
  const processing = videos.filter(v => ['transcribing', 'translating', 'muxing'].includes(v.status)).length;
  const percentage = Math.round((completed / total) * 100);

  return (
    <header className="p-8 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Batch Status</p>
            <h2 className="text-3xl font-black text-white">
              {completed} <span className="text-gray-600">/</span> {total} 
              <span className="text-sm ml-3 font-medium text-gray-400 uppercase tracking-normal">Videos Processed</span>
            </h2>
          </div>
          
          <div className="flex gap-6 text-right">
            <div className="hidden sm:block">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Active Jobs</p>
              <p className="font-mono text-blue-400 font-bold">{processing}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase mb-1">Completion</p>
              <p className="font-mono text-green-400 font-bold">{percentage}%</p>
            </div>
          </div>
        </div>

        {/* The Neon Progress Bar */}
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 via-emerald-400 to-cyan-500 transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    </header>
  );
}