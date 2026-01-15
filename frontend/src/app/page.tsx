"use client";

import React, { useState, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlobalProgress from '@/components/dashboard/GlobalProgress';
import VideoList from '@/components/dashboard/VideoList';
import { api } from '@/lib/api';
import { VideoFile } from '@/lib/types';
import { useVideoStatus } from '@/hooks/useSocket';

export default function DashboardPage() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("/data");
  const [globalSettings, setGlobalSettings] = useState({
    targetLanguage: 'fr',
    shouldMux: true,
    shouldRemoveOriginal: false
  });

  /**
   * IMPORTANT: real-time updates. 
   * Ensure useVideoStatus uses functional updates: setVideos(prev => ...) 
   * to avoid the "Maximum call stack size" error.
   */
  useVideoStatus(videos, setVideos);

  const handleScan = useCallback(async () => {
    setIsScanning(true);
    try {
      // We scan "/data" because that's where MEDIA_PATH is mounted in Docker
      const data = await api.scanFolder("/data", true);
      
      // Map backend fields to frontend expected fields if necessary
      const mappedVideos = data.files.map((v: any) => ({
        ...v,
        filename: v.fileName || v.filename, // Handle naming variations
        status: v.status || 'idle',
        progress: v.progress || 0,
        current_step: v.current_step || 'Ready'
      }));

      setVideos(mappedVideos);
      setCurrentPath(data.currentPath || data.rootPath);
    } catch (error) {
      console.error("Scan failed:", error);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleProcessAll = async () => {
    if (videos.length === 0) return;
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
    <div className="flex h-screen w-full bg-[#0a0a0a] overflow-hidden text-slate-200">
      <Sidebar 
        currentPath={currentPath}
        onScanFolder={handleScan}
        isScanning={isScanning}
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
        
        {/* Background Ambient Glow */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] pointer-events-none" />
      </main>
    </div>
  );
}