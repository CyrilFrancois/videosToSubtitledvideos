"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { useStudio } from '@/app/page';
import { Activity, Terminal, ChevronRight, Cpu, Zap, CheckCircle2, PartyPopper } from 'lucide-react';
import { VideoFile } from '@/lib/types';

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
          <Cpu size={24} className="opacity-20" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">System Standby — Awaiting Input</span>
        </div>
      )}
    </div>
  );
}

export default function GlobalProgress() {
  const studio = useStudio();
  
  if (!studio || !studio.state) return null;

  const { items, logs, selectedIds } = studio.state;

  const selectedVideos = useMemo(() => {
    const selected: VideoFile[] = [];
    const traverse = (list: VideoFile[]) => {
      list.forEach(item => {
        if (!item.is_directory && selectedIds.has(item.id)) {
          selected.push(item);
        }
        if (item.children) traverse(item.children);
      });
    };
    traverse(items || []);
    return selected;
  }, [items, selectedIds]);

  const activeItems = useMemo(() => 
    selectedVideos.filter(v => ['processing', 'queued'].includes(v.status || '')),
  [selectedVideos]);

  const completedCount = selectedVideos.filter(v => v.status === 'done').length;
  const totalCount = selectedVideos.length;
  
  const isProcessing = activeItems.length > 0;
  const isFullyDone = totalCount > 0 && completedCount === totalCount;
  const globalPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // We find the last processed video to keep its name visible even after it finishes
  const lastActiveVideo = useMemo(() => {
    if (activeItems.length > 0) return activeItems[0];
    if (isFullyDone) return selectedVideos[selectedVideos.length - 1];
    return null;
  }, [activeItems, isFullyDone, selectedVideos]);

  const currentLogs = lastActiveVideo 
    ? logs[lastActiveVideo.filePath] || logs[lastActiveVideo.id] || [] 
    : [];

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
              <span className={`text-4xl font-black tabular-nums tracking-tighter transition-colors duration-500 ${isFullyDone ? 'text-emerald-400' : 'text-white'}`}>
                {completedCount}<span className="text-gray-700 mx-1">/</span>{totalCount}
              </span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pb-1">
                Tasks Completed
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
             <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black tracking-widest transition-all duration-500 ${
               isProcessing 
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                : isFullyDone 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-white/5 border-white/10 text-gray-500'
             }`}>
               {isProcessing ? (
                 <> <Zap size={10} className="fill-current" /> PROCESSING </>
               ) : isFullyDone ? (
                 <> <PartyPopper size={10} /> ALL BATCHES FINISHED </>
               ) : (
                 <> <CheckCircle2 size={10} /> {totalCount > 0 ? 'READY FOR BATCH' : 'IDLE'} </>
               )}
             </div>
             
             {lastActiveVideo && (
               <div className={`flex items-center gap-2 text-[10px] font-mono px-3 py-1 rounded-md border transition-all duration-500 ${
                 isFullyDone ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300' : 'bg-indigo-500/5 border-indigo-500/10 text-indigo-300 animate-in slide-in-from-right-4'
               }`}>
                 <ChevronRight size={12} className={isFullyDone ? "text-emerald-500" : "text-indigo-500"} />
                 {isFullyDone ? `Completed: ${lastActiveVideo.fileName}` : `Active: ${lastActiveVideo.fileName}`}
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
                : isFullyDone 
                ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                : 'bg-white/10'
            }`}
            style={{ width: `${globalPercentage}%` }}
          />
        </div>

        {/* Terminal Section */}
        <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              <Terminal size={12} className={isProcessing ? "text-indigo-500" : isFullyDone ? "text-emerald-500" : "text-gray-600"} />
              System Execution Logs
            </div>
          </div>
          <LogTerminal logs={currentLogs} />
        </div>
      </div>
    </div>
  );
}