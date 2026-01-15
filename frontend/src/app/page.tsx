"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlobalProgress from '@/components/dashboard/GlobalProgress';
import VideoList from '@/components/dashboard/VideoList';
import { api } from '@/lib/api';
import { Folder } from 'lucide-react';
import { VideoFile } from '@/lib/types';

export default function DashboardPage() {
  const [items, setItems] = useState<VideoFile[]>([]); 
  const [isScanning, setIsScanning] = useState(false);
  const [currentPath, setCurrentPath] = useState("/data");
  const [mounted, setMounted] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Global Settings initialized for the "Smart" logic
  const [globalSettings, setGlobalSettings] = useState({
    sourceLang: ['auto'],
    targetLanguages: ['fr'], 
    workflowMode: 'hybrid',
    modelSize: 'base',
    autoGenerate: true,
    shouldMux: true,
    shouldRemoveOriginal: false
  });

  useEffect(() => {
    setMounted(true);
    handleInitialDeepScan();
  }, []);

  const handleInitialDeepScan = useCallback(async () => {
    setIsScanning(true);
    try {
      // API now returns the full nested tree
      const data = await api.scanFolder("/data", true); 
      if (data && data.files) {
        const processDeepItems = (files: any[]): VideoFile[] => {
          return files.map(item => ({
            ...item,
            id: item.filePath,
            status: item.is_directory ? 'folder' : 'idle',
            progress: 0,
            // Ensure subtitleInfo is passed through correctly
            subtitleInfo: item.subtitleInfo || { hasSubtitles: false, languages: [], count: 0 },
            children: item.is_directory ? processDeepItems(item.children || []) : null
          }));
        };

        setItems(processDeepItems(data.files));
      }
    } catch (e) {
      console.error("❌ Deep Scan Error:", e);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Helper to flatten the tree for processing while maintaining current state
  const getSelectedFilesList = useCallback(() => {
    const selectedFiles: VideoFile[] = [];
    const traverse = (list: VideoFile[]) => {
      list.forEach(item => {
        if (!item.is_directory && selectedIds.has(item.id)) {
          selectedFiles.push(item);
        }
        if (item.children) traverse(item.children);
      });
    };
    traverse(items);
    return selectedFiles;
  }, [items, selectedIds]);

  const selectedFiles = useMemo(() => getSelectedFilesList(), [getSelectedFilesList]);
  const selectedFilesCount = selectedFiles.length;

  const toggleSelection = useCallback((id: string, isDirectory: boolean, children?: any[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const isAdding = !next.has(id);

      const applyToggle = (targetId: string, itemChildren?: any[]) => {
        if (isAdding) next.add(targetId);
        else next.delete(targetId);

        if (itemChildren && itemChildren.length > 0) {
          itemChildren.forEach(child => applyToggle(child.id, child.children));
        }
      };

      applyToggle(id, children);
      return next;
    });
  }, []);

  const handleProcessSelected = async () => {
    if (selectedFilesCount === 0) return alert("Please select at least one video file.");
    
    try {
      const fileIds = selectedFiles.map(f => f.id);
      await api.startProcessing(fileIds, globalSettings);
      
      // Update UI status to 'processing' for selected files
      const markProcessing = (list: VideoFile[]): VideoFile[] => {
        return list.map(item => ({
          ...item,
          status: selectedIds.has(item.id) && !item.is_directory ? 'processing' : item.status,
          children: item.children ? markProcessing(item.children) : null
        })) as VideoFile[];
      };
      setItems(prev => markProcessing(prev));
      
    } catch (e) {
      alert("Error starting process: " + (e as Error).message);
    }
  };

  if (!mounted) return <div className="bg-[#0a0a0a] h-screen w-full" />;

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-slate-200">
      <Sidebar 
        currentPath={currentPath}
        onScanFolder={handleInitialDeepScan}
        isScanning={isScanning}
        globalSettings={globalSettings}
        setGlobalSettings={setGlobalSettings}
        onProcessAll={handleProcessSelected}
        hasVideos={selectedFilesCount > 0} 
        selectedCount={selectedFilesCount} 
      />

      <main className="flex-1 relative overflow-hidden flex flex-col">
        <GlobalProgress videos={selectedFiles} />
        
        <div className="flex-1 overflow-auto p-6">
          {items.length === 0 && !isScanning ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
              <Folder size={64} strokeWidth={1} className="mb-4" />
              <p className="text-lg font-medium tracking-tight">Library is empty or path not found</p>
            </div>
          ) : (
            <VideoList 
              videos={items} 
              onNavigate={setCurrentPath} 
              onStartJob={(id) => {
                // Individual start
                api.startProcessing([id], globalSettings);
              }} 
              onCancelJob={(id) => api.cancelJob(id)}
              selectedIds={selectedIds}
              toggleSelection={toggleSelection}
              globalSettings={globalSettings}
            />
          )}
        </div>
      </main>
    </div>
  );
}