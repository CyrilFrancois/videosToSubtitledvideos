"use client";

import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlobalProgress from '@/components/dashboard/GlobalProgress';
import VideoList from '@/components/dashboard/VideoList';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [videos, setVideos] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [currentPath, setCurrentPath] = useState("/data");
  const [globalSettings, setGlobalSettings] = useState({
    targetLanguages: ['fr'], 
    modelSize: 'base',
    shouldMux: true,
    shouldRemoveOriginal: false
  });

  useEffect(() => {
    document.title = "LEXI-STREAM AI";
    console.log("DASHBOARD LOADED: State initialized.");
  }, []);

  const handleScan = useCallback(async () => {
    console.log("HANDLER: handleScan triggered. Path:", currentPath);
    setIsScanning(true);
    try {
      const data = await api.scanFolder(currentPath || "/data", true);
      console.log("HANDLER: API Success:", data);
      if (data && data.files) {
        setVideos(data.files.map(v => ({
          ...v,
          filename: v.fileName || v.filename,
          status: v.status || 'idle',
          progress: v.progress || 0,
        })));
        setCurrentPath(data.currentPath);
      }
    } catch (error) {
      console.error("HANDLER: API Error:", error);
    } finally {
      setIsScanning(false);
    }
  }, [currentPath]);

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-slate-200">
      <Sidebar 
        currentPath={currentPath}
        onScanFolder={handleScan}
        isScanning={isScanning}
        globalSettings={globalSettings}
        setGlobalSettings={setGlobalSettings}
        onProcessAll={() => console.log("Process All Clicked")}
      />
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <GlobalProgress videos={videos} />
        <div className="flex-1 overflow-auto p-6">
          <VideoList 
            videos={videos} 
            onStartJob={(id) => console.log("Start single:", id)}
            onCancelJob={(id) => console.log("Cancel single:", id)}
          />
        </div>
      </main>
    </div>
  );
}