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

  const [globalSettings, setGlobalSettings] = useState({
    targetLanguages: ['fr'], 
    modelSize: 'base',
    shouldMux: true,
    shouldRemoveOriginal: false
  });

  // Initial Deep Scan: Load everything recursively
  useEffect(() => {
    setMounted(true);
    handleInitialDeepScan();
  }, []);

  const handleInitialDeepScan = useCallback(async () => {
    setIsScanning(true);
    try {
      // Logic assumes your backend API supports a recursive flag or deep scan
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
    console.log("🚀 [BATCH START]:", selectedFiles);
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
        {/* GlobalProgress now handles the N/N files done count correctly */}
        <GlobalProgress videos={selectedFiles} />
        
        <div className="flex-1 overflow-auto p-6">
          <header className="mb-6 border-b border-white/5 pb-4">
            <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Selected Library</h2>
                  <p className="text-indigo-300 font-mono text-xs mt-1">
                    {selectedFilesCount} video {selectedFilesCount === 1 ? 'file' : 'files'} to process
                  </p>
                </div>
                <p className="text-[10px] text-gray-600 font-mono italic">{currentPath}</p>
            </div>
          </header>

          {items.length === 0 && !isScanning ? (
            <div className="h-64 flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-white/10 rounded-2xl">
              <Folder size={48} className="mb-4" />
              <p className="text-xl font-medium">No items found</p>
            </div>
          ) : (
            <VideoList 
              videos={items} 
              onNavigate={setCurrentPath} // Path is only used for breadcrumbs now as data is pre-loaded
              onStartJob={(id) => console.log("Single Start:", id)} 
              onCancelJob={(id) => console.log("Cancel:", id)}
              selectedIds={selectedIds}
              toggleSelection={toggleSelection}
            />
          )}
        </div>
      </main>
    </div>
  );
}