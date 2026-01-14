"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlobalProgress from '@/components/dashboard/GlobalProgress';
import VideoList from '@/components/dashboard/VideoList';
import { api } from '@/lib/api';
import { VideoFile } from '@/lib/types';
import { useVideoStatus } from '@/hooks/useSocket';

export default function DashboardPage() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [globalSettings, setGlobalSettings] = useState({
    targetLanguage: 'fr',
    shouldMux: true,
    shouldRemoveOriginal: false
  });

  // Listen for real-time progress updates from the backend
  useVideoStatus(videos, setVideos);

  const handleScan = async () => {
    try {
      const data = await api.scanFolder("./data", true);
      setVideos(data.files);
      setCurrentPath(data.rootPath);
    } catch (error) {
      console.error("Scan failed:", error);
    }
  };

  const handleProcessAll = async () => {
    const fileIds = videos.map(v => v.id);
    await api.startProcessing(fileIds, globalSettings);
  };

  const handleStartSingle = async (id: string) => {
    await api.startProcessing([id], globalSettings);
  };

  const handleCancelSingle = async (id: string) => {
    await api.cancelJob(id);
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] overflow-hidden">
      <Sidebar 
        currentPath={currentPath}
        onScanFolder={handleScan}
        globalSettings={globalSettings}
        setGlobalSettings={setGlobalSettings}
        onProcessAll={handleProcessAll}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <GlobalProgress videos={videos} />
        
        <VideoList 
          videos={videos} 
          onStartJob={handleStartSingle}
          onCancelJob={handleCancelSingle}
        />
        
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] pointer-events-none" />
      </main>
    </div>
  );
}