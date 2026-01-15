"use client";

import React, { useState } from 'react';
import VideoCard from './VideoCard';
import { Ghost, ChevronRight, ChevronDown, Folder } from 'lucide-react';

interface VideoListProps {
  videos: any[];
  onStartJob: (id: string) => void;
  onCancelJob: (id: string) => void;
  onNavigate: (path: string) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string, isDirectory: boolean, children?: any[]) => void;
  globalSettings: any; // Added this prop
}

export default function VideoList({ 
  videos, 
  onStartJob, 
  onCancelJob, 
  onNavigate,
  selectedIds,
  toggleSelection,
  globalSettings // Added this prop
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
            
            {/* FOLDER ROW */}
            {item.is_directory ? (
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
                    onNavigate={onNavigate}
                    globalSettings={globalSettings} // Passed to card
                  />
                </div>
              </div>
            )}

            {/* RECURSIVE RENDER (Indented) */}
            {item.is_directory && expandedFolders.has(item.id) && item.children && (
               <div className="ml-8 mt-1 border-l-2 border-white/5 pl-4 space-y-2">
                  <VideoList 
                    videos={item.children}
                    onStartJob={onStartJob}
                    onCancelJob={onCancelJob}
                    onNavigate={onNavigate}
                    selectedIds={selectedIds}
                    toggleSelection={toggleSelection}
                    globalSettings={globalSettings} // Passed to sub-folder list
                  />
               </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}