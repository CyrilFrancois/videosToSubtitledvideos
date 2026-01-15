import React from 'react';
import { FileVideo, Play, XCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function VideoCard({ video, onStart, onCancel }) {
  const getStatusColor = () => {
    switch (video.status) {
      case 'done': return 'border-green-500/50 bg-green-500/5';
      case 'processing': return 'border-blue-500/50 bg-blue-500/5';
      default: return 'border-white/10 bg-white/5';
    }
  };

  return (
    <div className={`p-4 rounded-2xl border transition-all duration-500 ${getStatusColor()}`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${video.status === 'done' ? 'bg-green-500/20' : 'bg-white/5'}`}>
          <FileVideo className={video.status === 'done' ? 'text-green-400' : 'text-gray-400'} size={24} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">{video.filename}</h3>
            <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-gray-400 border border-white/10">MP4</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-tighter">
            {video.status === 'idle' ? 'Ready to process' : `${video.current_step}...`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {video.status === 'processing' ? (
            <button onClick={() => onCancel(video.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors">
              <XCircle size={20} />
            </button>
          ) : video.status === 'done' ? (
            <CheckCircle2 size={24} className="text-green-500" />
          ) : (
            <button 
              onClick={() => onStart(video.id)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-blue-400 transition-colors"
            >
              <Play size={14} fill="currentColor" /> PROCESS
            </button>
          )}
        </div>
      </div>

      {video.status === 'processing' && (
        <div className="mt-4 space-y-2">
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500 ease-out" 
              style={{ width: `${video.progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-blue-400/80 uppercase">
            <span>Progress: {video.progress}%</span>
            <span className="animate-pulse">Active Pipeline</span>
          </div>
        </div>
      )}
    </div>
  );
}