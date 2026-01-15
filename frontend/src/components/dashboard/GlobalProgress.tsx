import React from 'react';

export default function GlobalProgress({ videos }) {
  const completed = videos.filter(v => v.status === 'done').length;
  const total = videos.length;
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="sticky top-0 z-10 p-8 pb-4 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a] to-transparent">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">System Load</h2>
            <p className="text-3xl font-black text-white">{completed} / {total} <span className="text-sm text-gray-600 font-normal">Files Done</span></p>
          </div>
          <div className="text-right">
             <span className="text-xs font-mono text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
               {total > 0 && videos.some(v => v.status === 'processing') ? 'PROCESSOR BUSY' : 'SYSTEM IDLE'}
             </span>
          </div>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-1000"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}