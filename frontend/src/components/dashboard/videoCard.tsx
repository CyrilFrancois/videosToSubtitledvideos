"use client";

import React from 'react';
import { 
  Video, 
  Music, 
  Languages, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  X 
} from 'lucide-react';
import { VideoFile } from '@/lib/types';

interface VideoCardProps {
  video: VideoFile;
  onStart: (id: string) => void;
  onCancel: (id: string) => void;
}

export default function VideoCard({ video, onStart, onCancel }: VideoCardProps) {
  const isProcessing = video.status !== 'idle' && video.status !== 'done' && video.status !== 'error';
  
  // Logic for the multi-stage progress bar colors
  const getStatusColor = () => {
    switch (video.status) {
      case 'done': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'transcribing': return 'bg-purple-500';
      case 'translating': return 'bg-yellow-500';
      case 'muxing': return 'bg-orange-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className={`p-5 rounded-2xl border transition-all duration-300 ${
      video.status === 'done' 
        ? 'bg-green-500/5 border-green-500/30' 
        : 'bg-white/5 border-white/10 hover:border-white/20'
    }`}>
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left: Thumbnail/Icon & Basic Info */}
        <div className="flex gap-4 flex-1">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
            video.status === 'done' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/10 text-blue-400'
          }`}>
            <Video size={28} />
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg truncate text-gray-100">{video.fileName}</h3>
              <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-gray-400 uppercase">
                {video.extension}
              </span>
            </div>
            
            {/* Metadata Badges */}
            <div className="flex flex-wrap gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Music size={14} className="text-gray-500" />
                <span>Audio: {video.audioStreams.map(a => a.language.toUpperCase()).join(', ') || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Languages size={14} className="text-gray-500" />
                <span>Internal Subs: {video.internalSubtitles.length > 0 ? video.internalSubtitles.map(s => s.language.toUpperCase()).join(', ') : 'None'}</span>
              </div>
              {video.externalSubtitles.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400/80 bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/10">
                  <FileText size={14} />
                  <span>External Found: {video.externalSubtitles.length} files</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Controls & Status */}
        <div className="flex flex-col justify-between items-end gap-4 min-w-[200px]">
          {video.status === 'done' ? (
            <div className="flex items-center gap-2 text-green-400 font-bold text-sm bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
              <CheckCircle2 size={16} /> COMPLETED
            </div>
          ) : video.status === 'error' ? (
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm bg-red-400/10 px-3 py-1.5 rounded-full border border-red-400/20">
              <AlertCircle size={16} /> FAILED
            </div>
          ) : isProcessing ? (
            <button 
              onClick={() => onCancel(video.id)}
              className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
            >
              <X size={14} /> CANCEL JOB
            </button>
          ) : (
            <button 
              onClick={() => onStart(video.id)}
              className="px-4 py-2 bg-white/10 hover:bg-green-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all group"
            >
              <Play size={14} className="group-hover:fill-current" /> START
            </button>
          )}
          
          <div className="text-right">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Target Language</span>
            <span className="text-sm font-mono text-gray-300">{video.outputLanguages.join(', ').toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Bottom: Progress Area (Visible only when active or done) */}
      {(isProcessing || video.status === 'done') && (
        <div className="mt-6 pt-4 border-t border-white/5 space-y-3">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
                Stage: {video.status}
              </p>
              <p className="text-xs text-gray-400 truncate max-w-md italic">
                {video.currentTask || "Preparing engine..."}
              </p>
            </div>
            <span className="text-sm font-mono font-bold text-gray-200">{video.progress}%</span>
          </div>
          
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ease-out rounded-full ${getStatusColor()}`}
              style={{ width: `${video.progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}