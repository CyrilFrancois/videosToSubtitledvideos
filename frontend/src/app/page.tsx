"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlobalProgress from '@/components/dashboard/GlobalProgress';
import VideoList from '@/components/dashboard/VideoList';
import { api } from '@/lib/api';
import { Folder } from 'lucide-react';

export default function DashboardPage() {
  const [items, setItems] = useState<any[]>([]); 
  const [isScanning, setIsScanning] = useState(false);
  const [currentPath, setCurrentPath] = useState("/data");
  const [mounted, setMounted] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 1. Updated globalSettings with the new keys
  const [globalSettings, setGlobalSettings] = useState({
    sourceLang: ['auto'],        // Added
    targetLanguages: ['fr'], 
    workflowMode: 'hybrid',      // Added
    modelSize: 'base',
    autoGenerate: true,          // Added
    shouldMux: true,
    shouldRemoveOriginal: false
  });

  // Initial Deep Scan
  useEffect(() => {
    setMounted(true);
    handleInitialDeepScan();
  }, []);

  const handleInitialDeepScan = useCallback(async () => {
    setIsScanning(true);
    try {
      const data = await api.scanFolder("/data", { recursive: true }); 
      if (data && data.files) {
        const processDeepItems = (files: any[]): any[] => {
          return files.map(item => ({
            ...item,
            id: item.filePath,
            status: item.is_directory ? 'folder' : 'idle',
            progress: 0,
            children: item.is_directory ? processDeepItems(item.children || []) : null
          }));
        };

        const processed = processDeepItems(data.files);
        setItems(processed);
      }
    } catch (e) {
      console.error("❌ Deep Scan Error:", e);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const getSelectedFilesList = useCallback(() => {
    const selectedFiles: any[] = [];
    const traverse = (list: any[]) => {
      list.forEach(item => {
        if (!item.is_directory && selectedIds.has(item.id)) {
          // 3. Merging global settings into the job options
          selectedFiles.push({ ...item, options: { ...globalSettings } });
        }
        if (item.children) traverse(item.children);
      });
    };
    traverse(items);
    return selectedFiles;
  }, [items, selectedIds, globalSettings]);

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
    console.log("🚀 [BATCH START] Payload:", selectedFiles);
    // Here you would typically call your backend API with selectedFiles
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
              onStartJob={(id) => console.log("Single Start:", id)} 
              onCancelJob={(id) => console.log("Cancel:", id)}
              selectedIds={selectedIds}
              toggleSelection={toggleSelection}
              // 2. Added globalSettings prop here
              globalSettings={globalSettings}
            />
          )}
        </div>
      </main>
    </div>
  );
}