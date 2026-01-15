import React from 'react';
import { FileVideo, Play, XCircle, CheckCircle2, Folder, ChevronRight } from 'lucide-react';

export default function VideoCard({ video, onStart, onCancel, onNavigate }) {
  const isDir = video.is_directory;

  const getStatusColor = () => {
    if (isDir) return 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-indigo-500/30 cursor-pointer';
    switch (video.status) {
      case 'done': return 'border-green-500/30 bg-green-500/5';
      case 'processing': return 'border-indigo-500/50 bg-indigo-500/5';
      default: return 'border-white/10 bg-white/5 hover:bg-white/[0.07]';
    }
  };

  const handleClick = () => {
    if (isDir) {
      onNavigate(video.filePath);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`group p-4 rounded-2xl border transition-all duration-300 ${getStatusColor()}`}
    >
      <div className="flex items-center gap-4">
        {/* Icon Section */}
        <div className={`p-3 rounded-xl transition-colors ${
          isDir ? 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20' : 
          video.status === 'done' ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400'
        }`}>
          {isDir ? <Folder size={24} fill="currentColor" className="opacity-70" /> : <FileVideo size={24} />}
        </div>
        
        {/* Info Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-200 truncate group-hover:text-white transition-colors">
              {video.fileName}
            </h3>
            {!isDir && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-gray-500 border border-white/10 uppercase font-bold">
                {video.extension || 'media'}
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-semibold">
            {isDir ? 'Directory' : video.status === 'idle' ? 'Ready to process' : `${video.status}...`}
          </p>
        </div>

        {/* Action Section */}
        <div className="flex items-center gap-2">
          {isDir ? (
            <ChevronRight size={20} className="text-gray-600 group-hover:text-indigo-400 transition-all group-hover:translate-x-1" />
          ) : video.status === 'processing' ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onCancel(video.id); }} 
              className="p-2 text-gray-500 hover:text-red-500 transition-colors"
            >
              <XCircle size={20} />
            </button>
          ) : video.status === 'done' ? (
            <CheckCircle2 size={24} className="text-green-500" />
          ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); onStart(video.id); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
            >
              <Play size={14} fill="currentColor" /> PROCESS
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar (Only for files being processed) */}
      {!isDir && video.status === 'processing' && (
        <div className="mt-4 space-y-2">
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
              style={{ width: `${video.progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-indigo-400/80 uppercase tracking-tighter">
            <span>Progress: {video.progress}%</span>
            <span className="animate-pulse">Analyzing Frames...</span>
          </div>
        </div>
      )}
    </div>
  );
}