import React from 'react';
import { Activity, LayoutGrid } from 'lucide-react';

export default function GlobalProgress({ videos }) {
  const total = videos.length;
  const completed = videos.filter(v => v.status === 'done').length;
  const isProcessing = videos.some(v => v.status === 'processing');
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="sticky top-0 z-10 p-8 pb-4 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a] to-transparent">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
              <Activity size={12} className={isProcessing ? "text-indigo-500 animate-pulse" : "text-gray-600"} />
              Studio Monitor
            </h2>
            
            {total > 0 ? (
              <p className="text-3xl font-black text-white">
                {completed} / {total} 
                <span className="ml-3 text-xs text-gray-600 font-mono uppercase tracking-widest">
                  Processed
                </span>
              </p>
            ) : (
              <p className="text-3xl font-bold text-gray-700 italic tracking-tight">
                Select media to initialize batch...
              </p>
            )}
          </div>

          <div className="text-right">
             <span className={`text-[10px] font-mono px-4 py-1.5 rounded-full border transition-all duration-500 ${
               isProcessing 
                ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                : 'text-gray-600 bg-white/5 border-white/5'
             }`}>
               {isProcessing ? 'ENGINE ACTIVE' : 'STUDIO STANDBY'}
             </span>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/5">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${
              isProcessing 
                ? 'bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-400' 
                : 'bg-gray-800'
            }`}
            style={{ width: total > 0 ? `${percentage}%` : '0%' }}
          />
        </div>
      </div>
    </div>
  );
}