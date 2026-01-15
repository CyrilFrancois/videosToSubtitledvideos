"use client";

import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlobalProgress from '@/components/dashboard/GlobalProgress';
import VideoList from '@/components/dashboard/VideoList';
import { api } from '@/lib/api';
import { Folder } from 'lucide-react';

export default function DashboardPage() {
  const [videos, setVideos] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [currentPath, setCurrentPath] = useState("/data");
  const [mounted, setMounted] = useState(false); // NEW: Hydration fix
  
  const [globalSettings, setGlobalSettings] = useState({
    targetLanguages: ['fr'], 
    modelSize: 'base',
    shouldMux: true,
    shouldRemoveOriginal: false
  });

  // Handle Hydration
  useEffect(() => {
    setMounted(true);
    console.log("🖥️ [BROWSER]: Client-side hydration complete.");
  }, []);

  const handleScan = useCallback(async () => {
    console.log("🖱️ [LOG]: Scan function called from Page.tsx");
    setIsScanning(true);
    try {
      const data = await api.scanFolder(currentPath || "/data", true);
      if (data?.files) {
        setVideos(data.files.map((v, i) => ({
          ...v,
          id: v.id || v.filename || `v-${i}`,
          status: v.status || 'idle',
          progress: v.progress || 0,
        })));
        if (data.currentPath) setCurrentPath(data.currentPath);
      }
    } catch (e) {
      console.error("❌ Scan Error:", e);
    } finally {
      setIsScanning(false);
    }
  }, [currentPath]);

  // Don't render interactive elements until mounted on client
  if (!mounted) return <div className="bg-[#0a0a0a] h-screen w-full" />;

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-slate-200">
      <Sidebar 
        currentPath={currentPath}
        onScanFolder={handleScan}
        isScanning={isScanning}
        globalSettings={globalSettings}
        setGlobalSettings={setGlobalSettings}
        onProcessAll={() => console.log("Batch Start")}
        hasVideos={videos.length > 0} 
      />

      <main className="flex-1 relative overflow-hidden flex flex-col">
        <GlobalProgress videos={videos} />
        <div className="flex-1 overflow-auto p-6">
          {videos.length === 0 && !isScanning && (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <Folder size={48} className="mb-4" />
              <p className="text-xl font-medium">No videos loaded</p>
            </div>
          )}
          <VideoList videos={videos} onStartJob={() => {}} onCancelJob={() => {}} />
        </div>
      </main>
    </div>
  );
}