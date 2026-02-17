"use client";

import React, { useState, useMemo } from 'react';
import { useStudio } from '@/app/page';
import VideoCard from './VideoCard';
import { Ghost, ChevronRight, ChevronDown, Folder, Loader2 } from 'lucide-react';
import { VideoFile } from '@/lib/types';

interface VideoListProps {
  videos: VideoFile[];
  isNested?: boolean;
}

export default function VideoList({ videos, isNested = false }: VideoListProps) {
  const { state, actions } = useStudio();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const handleFolderToggle = (e: React.MouseEvent, item: VideoFile) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(item.id)) {
      newExpanded.delete(item.id);
    } else {
      newExpanded.add(item.id);
    }
    setExpandedFolders(newExpanded);
  };

  /**
   * Helper to check if a folder is "selected" based on its video children.
   * A folder is selected if all its nested video files are in the selectedIds set.
   */
  const getFolderSelectionState = (item: VideoFile) => {
    if (!item.children || item.children.length === 0) return false;
    
    const getAllVideoIds = (files: VideoFile[]): string[] => {
      let ids: string[] = [];
      files.forEach(f => {
        if (!f.is_directory) ids.push(f.id);
        if (f.children) ids.push(...getAllVideoIds(f.children));
      });
      return ids;
    };

    const videoIds = getAllVideoIds(item.children);
    if (videoIds.length === 0) return false;
    return videoIds.every(id => state.selectedIds.has(id));
  };

  // 1. LOADING STATE
  if (!isNested && state.isScanning && videos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
        <Loader2 className="text-indigo-500 animate-spin mb-4" size={32} />
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Scanning Filesystem...</h3>
      </div>
    );
  }

  // 2. EMPTY STATE
  if (videos.length === 0 && !isNested) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-20 border border-dashed border-white/5 rounded-3xl m-6">
        <Ghost size={40} className="text-white/10 mb-4" />
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">No Media Found</h3>
      </div>
    );
  }

  // 3. MAIN RENDER
  return (
    <div className={`flex flex-col ${!isNested ? "max-w-5xl mx-auto pb-20 w-full" : "w-full"}`}>
      {videos.map((item) => {
        const isExpanded = expandedFolders.has(item.id);
        const isFolderSelected = item.is_directory ? getFolderSelectionState(item) : false;

        return (
          <div key={item.id} className="w-full flex flex-col">
            {item.is_directory ? (
              /* --- FOLDER ROW --- */
              <div 
                onClick={(e) => handleFolderToggle(e, item)}
                className="group flex items-center bg-white/[0.02] hover:bg-white/[0.04] rounded-xl transition-all pr-4 py-3 my-0.5 cursor-pointer border border-white/5 shadow-sm"
              >
                {/* Folder Checkbox: Controls all nested videos */}
                <div className="pl-4 pr-3" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-white/10 bg-white/5 accent-indigo-600 cursor-pointer"
                    checked={isFolderSelected}
                    onChange={() => actions.toggleSelection(item.id, true, item.children || [])}
                  />
                </div>
                
                <div className="mr-3 text-gray-500 group-hover:text-indigo-400 transition-colors">
                   {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>

                <Folder size={18} className="mr-3 text-indigo-500/50" fill="currentColor" />
                
                <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors truncate flex-1">
                  {item.fileName}
                </span>

                <span className="text-[10px] font-mono text-gray-600 uppercase tabular-nums">
                  {item.children?.length || 0} items
                </span>
              </div>
            ) : (
              /* --- VIDEO ROW --- */
              <div className="flex items-center w-full">
                {/* Checkbox removed from here. 
                   It should be handled inside <VideoCard /> to avoid duplication.
                */}
                <div className="flex-1 min-w-0">
                  <VideoCard video={item} />
                </div>
              </div>
            )}

            {/* --- RECURSIVE CHILD RENDER --- */}
            {item.is_directory && isExpanded && (
               <div className="ml-8 border-l border-white/10 pl-2 animate-in slide-in-from-top-2 duration-200">
                  {item.children && item.children.length > 0 ? (
                    <VideoList videos={item.children} isNested={true} />
                  ) : (
                    <div className="py-2 pl-10 text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                      Empty Folder
                    </div>
                  )}
               </div>
            )}
          </div>
        );
      })}
    </div>
  );
}