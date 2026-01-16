"use client";

import React, { useState } from 'react';
import VideoCard from './VideoCard';
import { Ghost, ChevronRight, ChevronDown, Folder, Loader2 } from 'lucide-react';
import { VideoFile } from '@/lib/types';

interface VideoListProps {
  videos: VideoFile[];
  isLoading?: boolean;
  onStartJob: (video: VideoFile) => void;
  onCancelJob: (id: string) => void;
  onNavigate: (path: string) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string, isDirectory: boolean, children?: any[]) => void;
  globalSettings: any;
  updateVideoData: (id: string, updates: Partial<VideoFile>) => void; // Added updater
}

export default function VideoList({ 
  videos, 
  isLoading = false, 
  onStartJob, 
  onCancelJob, 
  onNavigate,
  selectedIds,
  toggleSelection,
  globalSettings,
  updateVideoData // Distribute this to children
}: VideoListProps) {
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const handleFolderClick = (id: string, path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      onNavigate(path); 
    }
    setExpandedFolders(newExpanded);
  };

  // 1. LOADING STATE
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-20 animate-in fade-in duration-500">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
          <div className="relative w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
            <Loader2 className="text-indigo-500 animate-spin" size={40} />
          </div>
        </div>
        <h3 className="text-xl font-bold text-white mb-3">Initializing SubStudio</h3>
        <p className="max-w-md text-sm text-gray-400 leading-relaxed">
          Scanning media library and synchronizing metadata. This may take a moment while we decrypt local streams and link existing subtitle files.
        </p>
      </div>
    );
  }

  // 2. EMPTY STATE
  if (videos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-20 border-2 border-dashed border-white/5 rounded-3xl">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-gray-600 mb-6">
          <Ghost size={40} />
        </div>
        <h3 className="text-xl font-bold text-gray-300">No items found</h3>
        <p className="text-xs text-gray-500 mt-2">Check your source path or try refreshing the scan.</p>
      </div>
    );
  }

  // 3. MAIN LIST
  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-2 pb-10">
        {videos.map((item) => (
          <div key={item.id} className="flex flex-col">
            {item.is_directory ? (
              /* FOLDER ROW */
              <div 
                onClick={() => handleFolderClick(item.id, item.filePath)}
                className="group flex items-center bg-white/[0.03] hover:bg-indigo-500/10 rounded-xl transition-all pr-4 py-4 my-1 cursor-pointer border border-white/5 shadow-sm"
              >
                <div className="pl-5 pr-3" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-white/10 bg-white/10 checked:bg-indigo-500 cursor-pointer accent-indigo-500"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelection(item.id, item.is_directory, item.children)}
                  />
                </div>
                <div className="mr-3 text-indigo-400/70 group-hover:text-indigo-400 transition-colors">
                   {expandedFolders.has(item.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
                <Folder size={20} className="mr-3 text-indigo-400/60" fill="currentColor" />
                <span className="text-[15px] font-semibold text-gray-200 group-hover:text-white transition-colors truncate flex-1">
                  {item.fileName}
                </span>
                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest ml-4">
                  {item.children?.length || 0} items
                </span>
              </div>
            ) : (
              /* VIDEO ROW */
              <div className="flex items-center group bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl transition-colors pr-2">
                <div className="pl-4 pr-2">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-white/10 bg-white/10 checked:bg-indigo-500 cursor-pointer accent-indigo-500"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelection(item.id, item.is_directory, item.children)}
                  />
                </div>
                <div className="w-8 flex justify-center invisible">
                  <ChevronRight size={18} />
                </div>
                <div className="flex-1">
                  <VideoCard 
                    video={item} 
                    onStart={onStartJob}
                    onCancel={onCancelJob}
                    updateVideoData={updateVideoData} // Pass the updater here
                    globalSettings={globalSettings}
                  />
                </div>
              </div>
            )}

            {/* RECURSIVE RENDER */}
            {item.is_directory && expandedFolders.has(item.id) && item.children && (
               <div className="ml-8 mt-1 border-l-2 border-white/5 pl-4 space-y-2">
                  <VideoList 
                    videos={item.children}
                    isLoading={false} 
                    onStartJob={onStartJob}
                    onCancelJob={onCancelJob}
                    onNavigate={onNavigate}
                    selectedIds={selectedIds}
                    toggleSelection={toggleSelection}
                    globalSettings={globalSettings}
                    updateVideoData={updateVideoData} // Pass updater through levels
                  />
               </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}