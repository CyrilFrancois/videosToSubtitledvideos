"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlobalProgress from '@/components/dashboard/GlobalProgress';
import VideoList from '@/components/dashboard/VideoList';
import { api } from '@/lib/api';
import { VideoFile } from '@/lib/types';

export default function DashboardPage() {
  const [items, setItems] = useState<VideoFile[]>([]); 
  const [isScanning, setIsScanning] = useState(false);
  const [currentPath, setCurrentPath] = useState("/data");
  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activeListeners = useRef<Record<string, EventSource>>({});

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
    return () => {
      Object.values(activeListeners.current).forEach(es => es.close());
    };
  }, []);

  // --- RECURSIVE STATE UPDATER ---
  const updateVideoData = useCallback((id: string, updates: Partial<VideoFile>) => {
    setItems(prevItems => {
      const updateRecursive = (list: VideoFile[]): VideoFile[] => {
        return list.map(item => {
          // Check for id or absolute path matches
          if (item.id === id || item.filePath === id || item.filePath === `/${id}`) {
            return { ...item, ...updates };
          }
          if (item.children && item.children.length > 0) {
            return { ...item, children: updateRecursive(item.children) };
          }
          return item;
        });
      };
      return updateRecursive(prevItems);
    });
  }, []);

  // --- REAL-TIME UPDATES (SSE) ---
  const subscribeToUpdates = useCallback((fileId: string) => {
    if (activeListeners.current[fileId]) {
      activeListeners.current[fileId].close();
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // FIX: Ensure no double slashes by encoding the path carefully
    const encodedId = encodeURIComponent(fileId);
    const eventSource = new EventSource(`${apiUrl}/api/events/${encodedId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // We match by the fileId sent by backend
        updateVideoData(data.fileId, {
          status: data.status,
          progress: data.progress,
          statusText: data.message 
        });

        if (['done', 'error', 'cancelled'].includes(data.status)) {
          eventSource.close();
          delete activeListeners.current[fileId];
        }
      } catch (err) {
        console.error("Failed to parse SSE data:", err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      delete activeListeners.current[fileId];
    };

    activeListeners.current[fileId] = eventSource;
  }, [updateVideoData]);

  // --- WORKFLOW RESOLUTION ---
  const resolveWorkflow = (item: VideoFile, mode: string) => {
    // Priority 1: Force AI mode
    if (mode === 'whisper' || mode === 'force_ai') return 'whisper';
    
    // Priority 2: Use existing SRT if detected by the scanner
    if (item.subtitleInfo?.hasSrt || item.subtitleInfo?.srtPath !== "None") {
      return 'srt';
    }
    
    // Priority 3: Embedded tracks
    if (item.subtitleInfo?.subType === 'embedded') return 'embedded';
    
    // Fallback: AI Transcription
    return 'whisper';
  };

  // --- PROCESSING LOGIC ---
  const handleProcess = useCallback(async (targetVideos: VideoFile[]) => {
    if (targetVideos.length === 0) return;

    const payload = {
      videos: targetVideos.map(v => {
        const currentWorkflow = resolveWorkflow(v, globalSettings.workflowMode);
        return {
          name: v.fileName,
          path: v.filePath,
          srtFoundPath: v.subtitleInfo?.srtPath || "None",
          src: v.sourceLang?.[0] || 'auto',
          out: v.targetLanguages || ['fr'],
          workflowMode: currentWorkflow,
          syncOffset: v.syncOffset || 0
        };
      }),
      globalOptions: {
        transcriptionEngine: globalSettings.modelSize,
        generateSRT: globalSettings.autoGenerate,
        muxIntoMkv: globalSettings.shouldMux,
        cleanUp: globalSettings.shouldRemoveOriginal
      }
    };

    targetVideos.forEach(v => {
      updateVideoData(v.id, { status: 'processing', progress: 2, statusText: 'Connecting...' });
      
      // FIX: Strip leading slash for the EventSource URL to prevent //data/...
      const socketId = v.filePath.startsWith('/') ? v.filePath.substring(1) : v.filePath;
      subscribeToUpdates(socketId);
    });
    
    try {
      await api.startJob(payload);
    } catch (err) {
      console.error("Job Dispatch Failed:", err);
      targetVideos.forEach(v => updateVideoData(v.id, { status: 'error', statusText: 'Server Error' }));
    }
  }, [globalSettings, updateVideoData, subscribeToUpdates]);

  // --- SCANNING ---
  const handleInitialDeepScan = useCallback(async () => {
    setIsScanning(true);
    try {
      const data = await api.scanFolder("/data", true); 
      if (data?.files) {
        const processItems = (files: any[]): VideoFile[] => {
          return files.map(item => ({
            ...item,
            id: item.filePath, 
            status: item.is_directory ? 'folder' : 'idle',
            progress: 0,
            sourceLang: item.is_directory ? undefined : globalSettings.sourceLang,
            targetLanguages: item.is_directory ? undefined : [...globalSettings.targetLanguages],
            workflowMode: item.is_directory ? undefined : globalSettings.workflowMode,
            children: item.is_directory ? processItems(item.children || []) : null
          }));
        };
        setItems(processItems(data.files));
      }
    } catch (e) {
      console.error("❌ Scan Error:", e);
    } finally {
      setIsScanning(false);
    }
  }, [globalSettings]);

  // --- SELECTION HELPERS ---
  const toggleSelection = useCallback((id: string, isDir: boolean, children?: any[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const isAdding = !next.has(id);
      const apply = (tId: string, c?: any[]) => {
        isAdding ? next.add(tId) : next.delete(tId);
        if (c) c.forEach(child => apply(child.filePath, child.children));
      };
      apply(id, children);
      return next;
    });
  }, []);

  const selectedFilesList = useMemo(() => {
    const selected: VideoFile[] = [];
    const traverse = (list: VideoFile[]) => {
      list.forEach(item => {
        if (!item.is_directory && selectedIds.has(item.id)) selected.push(item);
        if (item.children) traverse(item.children);
      });
    };
    traverse(items);
    return selected;
  }, [items, selectedIds]);

  if (!mounted) return <div className="bg-[#0a0a0a] h-screen w-full" />;

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-slate-200 overflow-hidden">
      <Sidebar 
        currentPath={currentPath}
        onScanFolder={handleInitialDeepScan}
        isScanning={isScanning}
        globalSettings={globalSettings}
        setGlobalSettings={setGlobalSettings}
        onProcessAll={() => handleProcess(selectedFilesList)}
        hasVideos={selectedIds.size > 0} 
      />

      <main className="flex-1 relative flex flex-col overflow-hidden">
        <GlobalProgress videos={selectedFilesList} />
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          <VideoList 
            videos={items} 
            isLoading={isScanning}
            onNavigate={setCurrentPath} 
            onStartJob={(video) => handleProcess([video])}
            onCancelJob={() => api.abortAll()}
            selectedIds={selectedIds}
            toggleSelection={toggleSelection}
            globalSettings={globalSettings}
            updateVideoData={updateVideoData} 
          />
        </div>
      </main>
    </div>
  );
}