"use client";

import React, { useState } from 'react';
import { useStudio } from '@/app/page';
import VideoCard from './VideoCard';
import { Ghost, ChevronRight, ChevronDown, Folder, Loader2 } from 'lucide-react';
import { VideoFile } from '@/lib/types';

interface VideoListProps {
  videos: VideoFile[];
}

export default function VideoList({ videos }: VideoListProps) {
  const { state, actions } = useStudio();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Handle folder expansion and navigation logic
  const handleFolderToggle = (item: VideoFile) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(item.id)) {
      newExpanded.delete(item.id);
    } else {
      newExpanded.add(item.id);
      actions.navigate(item.filePath); 
    }
    setExpandedFolders(newExpanded);
  };

  // 1. LOADING STATE (Only shown at root level during scans)
  if (state.isScanning && videos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-20 animate-in fade-in duration-700">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full" />
          <div className="relative w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
            <Loader2 className="text-indigo-500 animate-spin" size={32} />
          </div>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Syncing Media Library</h3>
        <p className="max-w-xs text-[11px] text-gray-500 leading-relaxed uppercase tracking-widest">
          Indexing directory tree and extracting metadata headers...
        </p>
      </div>
    );
  }

  // 2. EMPTY STATE
  if (videos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-20 border border-dashed border-white/5 rounded-3xl m-6">
        <Ghost size={40} className="text-white/10 mb-4" />
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Empty Directory</h3>
      </div>
    );
  }

  // 3. MAIN LIST (Recursive)
  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar px-6">
      <div className="max-w-5xl mx-auto space-y-1 pb-20">
        {videos.map((item) => (
          <div key={item.id} className="flex flex-col">
            {item.is_directory ? (
              /* --- FOLDER ROW --- */
              <div 
                onClick={() => handleFolderToggle(item)}
                className="group flex items-center bg-white/[0.02] hover:bg-indigo-500/[0.04] rounded-xl transition-all pr-4 py-3 my-0.5 cursor-pointer border border-white/5 shadow-sm"
              >
                <div className="pl-4 pr-3" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-white/10 bg-white/5 accent-indigo-600 cursor-pointer"
                    checked={state.selectedIds.has(item.id)}
                    onChange={() => actions.toggleSelection(item.id, true, item.children || [])}
                  />
                </div>
                
                <div className="mr-3 text-gray-600 group-hover:text-indigo-400 transition-colors">
                   {expandedFolders.has(item.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>

                <Folder size={18} className="mr-3 text-indigo-500/40" fill="currentColor" />
                
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate flex-1">
                  {item.fileName}
                </span>

                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-gray-600 uppercase">
                    {item.children?.length || 0} Files
                  </span>
                </div>
              </div>
            ) : (
              /* --- VIDEO ROW --- */
              <div className="flex items-center group">
                {/* Checkbox padding matches folder row for visual alignment */}
                <div className="pl-4 pr-3 py-4 self-start mt-2">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-white/10 bg-white/5 accent-indigo-600 cursor-pointer"
                    checked={state.selectedIds.has(item.id)}
                    onChange={() => actions.toggleSelection(item.id, false)}
                  />
                </div>
                <div className="flex-1">
                  <VideoCard video={item} />
                </div>
              </div>
            )}

            {/* --- RECURSIVE RENDER --- */}
            {item.is_directory && expandedFolders.has(item.id) && item.children && (
               <div className="ml-[2.45rem] border-l border-white/[0.03] pl-2 animate-in slide-in-from-left-2 duration-200">
                  <VideoList videos={item.children} />
               </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}