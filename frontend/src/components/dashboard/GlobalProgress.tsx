"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { useStudio } from '@/app/page';
import { Activity, Terminal, ChevronRight, Cpu, Zap, CheckCircle2 } from 'lucide-react';
import { VideoFile } from '@/lib/types';

/**
 * Auto-scrolling Log Terminal with log-level highlighting
 */
function LogTerminal({ logs }: { logs: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs]);

  return (
    <div 
      ref={scrollRef}
      className="mt-4 h-48 w-full bg-black/80 border border-white/5 rounded-xl overflow-y-auto p-4 font-mono text-[11px] leading-relaxed shadow-inner custom-scrollbar selection:bg-indigo-500/30"
    >
      {logs.length > 0 ? (
        logs.map((log, i) => {
          const isError = /error|failed|exception/i.test(log);
          const isWarning = /warning|low memory/i.test(log);
          const isSuccess = /success|completed|done/i.test(log);
          
          return (
            <div key={i} className="flex gap-3 mb-1 animate-in fade-in slide-in-from-left-1 duration-300">
              <span className="text-gray-700 shrink-0 select-none">
                [{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
              </span>
              <span className={
                isError ? 'text-red-400' : 
                isWarning ? 'text-amber-400' : 
                isSuccess ? 'text-emerald-400 font-bold' : 
                'text-gray-300'
              }>
                <span className="text-indigo-500/50 mr-2">›</span>
                {log}
              </span>
            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-700 gap-3">
          <Cpu size={24} className="animate-pulse opacity-20" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Synchronizing Engine Stream...</span>
        </div>
      )}
    </div>
  );
}

export default function GlobalProgress() {
  const studio = useStudio();
  
  if (!studio || !studio.state) return null;

  const { items, logs, selectedIds } = studio.state;

  // 1. Get ONLY selected video files across the entire tree
  const selectedVideos = useMemo(() => {
    const selected: VideoFile[] = [];
    const traverse = (list: VideoFile[]) => {
      list.forEach(item => {
        // Only count if it's a video AND its ID is in the selected set
        if (!item.is_directory && selectedIds.has(item.id)) {
          selected.push(item);
        }
        if (item.children) traverse(item.children);
      });
    };
    traverse(items || []);
    return selected;
  }, [items, selectedIds]);

  // 2. Derive stats from the selected subset
  const activeItems = useMemo(() => 
    selectedVideos.filter(v => ['processing', 'queued'].includes(v.status || '')),
  [selectedVideos]);

  const completedCount = selectedVideos.filter(v => v.status === 'done').length;
  const totalCount = selectedVideos.length;
  
  const isProcessing = activeItems.length > 0;
  const globalPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Prioritize the log stream of the first active video in the selection
  const activeVideo = activeItems[0];
  const currentLogs = activeVideo ? logs[activeVideo.filePath] || logs[activeVideo.id] || [] : [];

  // Hide the progress monitor if no videos are selected
  if (totalCount === 0) return null;

  return (
    <div className="sticky top-0 z-30 px-8 py-6 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a] to-transparent backdrop-blur-sm">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-4">
          <div className="space-y-1">
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] flex items-center gap-2">
              <Activity size={12} className={isProcessing ? "text-indigo-500 animate-pulse" : "text-gray-600"} />
              Pipeline Monitor
            </h2>
            
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-white tabular-nums tracking-tighter">
                {completedCount}<span className="text-gray-700 mx-1">/</span>{totalCount}
              </span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pb-1">
                Selected Tasks
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
             <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black tracking-widest transition-all duration-500 ${
               isProcessing 
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500/60'
             }`}>
               {isProcessing ? (
                 <> <Zap size={10} className="fill-current" /> PROCESSING </>
               ) : (
                 <> <CheckCircle2 size={10} /> READY FOR BATCH </>
               )}
             </div>
             
             {activeVideo && (
               <div className="flex items-center gap-2 text-[10px] text-indigo-300 font-mono bg-indigo-500/5 px-3 py-1 rounded-md border border-indigo-500/10 animate-in slide-in-from-right-4">
                 <ChevronRight size={12} className="text-indigo-500" />
                 Active: {activeVideo.fileName}
               </div>
             )}
          </div>
        </div>

        {/* Global Progress Track */}
        <div className="relative h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/5">
          <div 
            className={`h-full transition-all duration-1000 ease-in-out ${
              isProcessing 
                ? 'bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-400' 
                : 'bg-emerald-600/40'
            }`}
            style={{ width: `${globalPercentage}%` }}
          />
          {isProcessing && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-20 animate-shimmer" />
          )}
        </div>

        {/* Terminal Section */}
        {isProcessing && (
          <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <Terminal size={12} className="text-indigo-500" />
                Live Execution Logs
              </div>
              <div className="flex gap-4">
                <div className="text-[9px] font-mono text-gray-600 uppercase">
                  Buffer: <span className="text-indigo-400/60">{currentLogs.length} Lines</span>
                </div>
              </div>
            </div>
            <LogTerminal logs={currentLogs} />
          </div>
        )}
      </div>
    </div>
  );
}