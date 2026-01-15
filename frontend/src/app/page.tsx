"use client";

import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlobalProgress from '@/components/dashboard/GlobalProgress';
import VideoList from '@/components/dashboard/VideoList';
import { api } from '@/lib/api';
import { Folder, ChevronLeft } from 'lucide-react';

export default function DashboardPage() {
  const [items, setItems] = useState([]); // Renamed from videos to items (folders + files)
  const [isScanning, setIsScanning] = useState(false);
  const [currentPath, setCurrentPath] = useState("/data");
  const [mounted, setMounted] = useState(false);
  
  const [globalSettings, setGlobalSettings] = useState({
    targetLanguages: ['fr'], 
    modelSize: 'base',
    shouldMux: true,
    shouldRemoveOriginal: false
  });

  useEffect(() => {
    setMounted(true);
    // Initial scan of the root
    handleNavigate("/data");
  }, []);

  const handleNavigate = useCallback(async (targetPath: string) => {
    console.log(`📂 [NAVIGATE]: Moving to ${targetPath}`);
    setIsScanning(true);
    try {
      // We pass the specific path to the API
      const data = await api.scanFolder(targetPath); 
      
      if (data && data.files) {
        // In our new scanner.py, 'files' now contains both is_directory: true and false
        setItems(data.files.map((item, i) => ({
          ...item,
          id: item.id || item.fileName || `item-${i}`,
          status: item.status || (item.is_directory ? 'folder' : 'idle'),
          progress: item.progress || 0,
        })));
        setCurrentPath(targetPath);
      }
    } catch (e) {
      console.error("❌ Navigation Error:", e);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleBack = () => {
    if (currentPath === "/data") return;
    const parts = currentPath.split('/');
    parts.pop();
    const parentPath = parts.join('/') || "/data";
    handleNavigate(parentPath);
  };

  if (!mounted) return <div className="bg-[#0a0a0a] h-screen w-full" />;

  // Filter items to see if we have any actual video files for the "Start Batch" logic
  const hasVideoFiles = items.some(item => !item.is_directory);

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-slate-200">
      <Sidebar 
        currentPath={currentPath}
        onScanFolder={() => handleNavigate("/data")}
        isScanning={isScanning}
        globalSettings={globalSettings}
        setGlobalSettings={setGlobalSettings}
        onProcessAll={() => console.log("Batch Start", items.filter(i => !i.is_directory))}
        hasVideos={hasVideoFiles} 
      />

      <main className="flex-1 relative overflow-hidden flex flex-col">
        <GlobalProgress videos={items.filter(i => !i.is_directory)} />
        
        <div className="flex-1 overflow-auto p-6">
          {/* Breadcrumb / Navigation Header */}
          <div className="mb-6 flex items-center gap-4">
            {currentPath !== "/data" && (
              <button 
                onClick={handleBack}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-indigo-400"
                title="Go Back"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Current Location</h2>
              <p className="text-indigo-300 font-mono text-xs">{currentPath}</p>
            </div>
          </div>

          {items.length === 0 && !isScanning ? (
            <div className="h-64 flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-white/10 rounded-2xl">
              <Folder size={48} className="mb-4" />
              <p className="text-xl font-medium">This folder is empty</p>
            </div>
          ) : (
            <VideoList 
              videos={items} 
              onNavigate={handleNavigate} 
              onStartJob={(id) => console.log("Start:", id)} 
              onCancelJob={(id) => console.log("Cancel:", id)} 
            />
          )}
        </div>
      </main>
    </div>
  );
}