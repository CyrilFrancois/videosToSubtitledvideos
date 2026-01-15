"use client";

import React, { useState } from 'react';
import VideoCard from './VideoCard';
import { Ghost, ChevronRight, ChevronDown } from 'lucide-react';

interface VideoListProps {
  videos: any[];
  onStartJob: (id: string) => void;
  onCancelJob: (id: string) => void;
  onNavigate: (path: string) => void;
  // New props for selection
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
  
  // State to track which folders are expanded
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string, path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      // Optional: Trigger a fetch for this specific folder if not already loaded
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
    <section className="flex-1 overflow-y-auto custom-scrollbar px-4">
      <div className="max-w-5xl mx-auto space-y-2 pb-20">
        {videos.map((item) => (
          <div key={item.id} className="flex flex-col">
            <div className="flex items-center group">
              {/* Checkbox for selection */}
              <div className="pr-4">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-white/10 bg-white/5 checked:bg-indigo-500 cursor-pointer"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleSelection(item.id, item.is_directory, item.children)}
                />
              </div>

              {/* Toggle Arrow for Folders */}
              {item.is_directory && (
                <button 
                  onClick={() => toggleExpand(item.id, item.filePath)}
                  className="p-1 mr-1 hover:bg-white/10 rounded text-gray-400"
                >
                  {expandedFolders.has(item.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
              )}

              {/* The actual Card */}
              <div className="flex-1">
                <VideoCard 
                  video={item} 
                  onStart={onStartJob}
                  onCancel={onCancelJob}
                  onNavigate={onNavigate}
                />
              </div>
            </div>

            {/* Recursive children display (if folder is expanded) */}
            {item.is_directory && expandedFolders.has(item.id) && item.children && (
               <div className="ml-12 mt-2 border-l border-white/5 pl-4 space-y-2">
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