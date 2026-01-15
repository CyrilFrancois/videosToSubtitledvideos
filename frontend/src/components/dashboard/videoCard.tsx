import React from 'react';
import { FileVideo, Play, XCircle, CheckCircle2, Folder } from 'lucide-react';

export default function VideoCard({ video, onStart, onCancel, onNavigate }) {
  const isDir = video.is_directory;

  // We only keep the inner content styling here
  const getStatusIconColor = () => {
    if (isDir) return 'bg-indigo-500/10 text-indigo-400';
    switch (video.status) {
      case 'done': return 'bg-green-500/20 text-green-400';
      case 'processing': return 'bg-indigo-500/20 text-indigo-400';
      default: return 'bg-white/5 text-gray-400';
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDir) {
      onNavigate(video.filePath);
    }
  };

  return (
    <div 
      onClick={handleAction}
      className={`p-3 transition-all duration-300 cursor-pointer`}
    >
      <div className="flex items-center gap-4">
        {/* Icon Section */}
        <div className={`p-2.5 rounded-xl transition-colors ${getStatusIconColor()}`}>
          {isDir ? <Folder size={20} fill="currentColor" className="opacity-70" /> : <FileVideo size={20} />}
        </div>
        
        {/* Info Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-300 truncate group-hover:text-white transition-colors text-sm">
              {video.fileName}
            </h3>
            {!isDir && (
              <span className="px-1.5 py-0.5 rounded text-[8px] bg-white/5 text-gray-500 border border-white/10 uppercase font-black">
                {video.extension || 'media'}
              </span>
            )}
          </div>
          <p className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-widest font-bold">
            {isDir ? 'Directory' : video.status === 'idle' ? 'Ready' : `${video.status}...`}
          </p>
        </div>

        {/* Action Section */}
        <div className="flex items-center gap-2 pr-2">
          {!isDir && (
            <>
              {video.status === 'processing' ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); onCancel(video.id); }} 
                  className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <XCircle size={18} />
                </button>
              ) : video.status === 'done' ? (
                <CheckCircle2 size={20} className="text-green-500" />
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); onStart(video.id); }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all active:scale-95 uppercase"
                >
                  <Play size={10} fill="currentColor" /> Process
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Progress Bar (Only for files being processed) */}
      {!isDir && video.status === 'processing' && (
        <div className="mt-3 pl-14 pr-4 space-y-1.5">
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500 ease-out" 
              style={{ width: `${video.progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-indigo-400/60 uppercase">
            <span>Progress: {video.progress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}