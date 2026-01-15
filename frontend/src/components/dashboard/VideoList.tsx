"use client";

import React, { useState } from 'react';
import VideoCard from './VideoCard';
import { Ghost, ChevronRight, ChevronDown } from 'lucide-react';

interface VideoListProps {
  videos: any[];
  onStartJob: (id: string) => void;
  onCancelJob: (id: string) => void;
  onNavigate: (path: string) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string, isDirectory: boolean, children?: any[]) => void;
}

export default function VideoList({ 
  videos, 
  onStartJob, 
  onCancelJob, 
  onNavigate,
  selectedIds,
  toggleSelection
}: VideoListProps) {
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleExpand = (e: React.MouseEvent, id: string, path: string) => {
    e.stopPropagation(); // Prevent card click events
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      onNavigate(path); 
    }
    setExpandedFolders(newExpanded);
  };

  if (videos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-20 border-2 border-dashed border-white/5 rounded-3xl">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-gray-600 mb-6">
          <Ghost size={40} />
        </div>
        <h3 className="text-xl font-bold text-gray-300">No items found</h3>
      </div>
    );
  }

  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-2 pb-10">
        {videos.map((item) => (
          <div key={item.id} className="flex flex-col">
            <div className="flex items-center group bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl transition-colors pr-2">
              
              {/* 1. SELECTION CHECKBOX */}
              <div className="pl-4 pr-2">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-white/10 bg-white/10 checked:bg-indigo-500 cursor-pointer accent-indigo-500"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleSelection(item.id, item.is_directory, item.children)}
                />
              </div>

              {/* 2. EXPAND ICON (Folders only) */}
              <div className="w-8 flex justify-center">
                {item.is_directory && (
                  <button 
                    onClick={(e) => toggleExpand(e, item.id, item.filePath)}
                    className="p-1 hover:bg-white/10 rounded-md text-gray-500 hover:text-indigo-400 transition-colors"
                  >
                    {expandedFolders.has(item.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                )}
              </div>

              {/* 3. VIDEO CARD CONTENT */}
              <div className="flex-1">
                <VideoCard 
                  video={item} 
                  onStart={onStartJob}
                  onCancel={onCancelJob}
                  onNavigate={onNavigate}
                />
              </div>
            </div>

            {/* 4. RECURSIVE RENDER */}
            {item.is_directory && expandedFolders.has(item.id) && item.children && (
               <div className="ml-10 mt-2 border-l-2 border-white/5 pl-4 space-y-2">
                  <VideoList 
                    videos={item.children}
                    onStartJob={onStartJob}
                    onCancelJob={onCancelJob}
                    onNavigate={onNavigate}
                    selectedIds={selectedIds}
                    toggleSelection={toggleSelection}
                  />
               </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}