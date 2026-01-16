"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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

  /**
   * PROPAGATION LOGIC
   * This effect forces individual items to sync when the Sidebar (Global Settings) changes.
   * By removing the "item.workflowMode ||" check, we ensure the Sidebar has authority.
   */
  useEffect(() => {
    if (items.length === 0) return;

    setItems(prevItems => {
      const propagate = (list: VideoFile[]): VideoFile[] => {
        return list.map(item => {
          if (item.is_directory) {
            return {
              ...item,
              children: item.children ? propagate(item.children) : null
            };
          }

          return {
            ...item,
            sourceLang: globalSettings.sourceLang[0],
            targetLanguages: [...globalSettings.targetLanguages],
            // FIX: Force update workflowMode when global settings change
            workflowMode: globalSettings.workflowMode, 
            children: null
          };
        });
      };
      return propagate(prevItems);
    });
  }, [globalSettings.sourceLang, globalSettings.targetLanguages, globalSettings.workflowMode]);

  const updateVideoData = useCallback((id: string, updates: Partial<VideoFile>) => {
    setItems(prevItems => {
      const updateRecursive = (list: VideoFile[]): VideoFile[] => {
        return list.map(item => {
          if (item.id === id) return { ...item, ...updates };
          if (item.children) return { ...item, children: updateRecursive(item.children) };
          return item;
        });
      };
      return updateRecursive(prevItems);
    });
  }, []);

  /**
   * Resolves the final workflow string for the backend payload
   */
  const resolveWorkflow = (subInfo: any, mode: string) => {
    if (mode === 'force_ai' || mode === 'whisper') return 'whisper';
    if (mode !== 'hybrid') return mode;
    
    // Hybrid logic: determine best path based on detection
    if (subInfo?.subType === 'external' || subInfo?.subType === 'external_isolated') return 'srt';
    if (subInfo?.subType === 'embedded') return 'embedded';
    return 'whisper';
  };

  /**
   * SCAN LOGIC + DATA NORMALIZATION
   */
  const handleInitialDeepScan = useCallback(async () => {
    setIsScanning(true);
    try {
      const data = await api.scanFolder("/data", true); 
      
      if (data && data.files) {
        const processDeepItems = (files: any[]): VideoFile[] => {
          return files.map(item => {
            const rawSubInfo = item.subtitleInfo || {};
            
            const normalizedSubInfo = {
              hasSubtitles: !!rawSubInfo.hasSubtitles,
              subType: rawSubInfo.subType || null,
              languages: rawSubInfo.languages || [],
              foundFiles: rawSubInfo.foundFiles || [],
              srtPath: rawSubInfo.srtPath || "None",
              count: rawSubInfo.count || 0
            };

            return {
              ...item,
              id: item.filePath,
              status: item.is_directory ? 'folder' : 'idle',
              progress: 0,
              subtitleInfo: normalizedSubInfo,
              sourceLang: item.is_directory ? undefined : globalSettings.sourceLang[0],
              targetLanguages: item.is_directory ? undefined : [...globalSettings.targetLanguages],
              // Initialize with the current global mode
              workflowMode: item.is_directory ? undefined : globalSettings.workflowMode,
              syncOffset: item.is_directory ? undefined : 0,
              children: item.is_directory ? processDeepItems(item.children || []) : null
            };
          });
        };
        setItems(processDeepItems(data.files));
      }
    } catch (e) {
      console.error("❌ SubStudio Scan Error:", e);
    } finally {
      setIsScanning(false);
    }
  }, [globalSettings.workflowMode, globalSettings.sourceLang, globalSettings.targetLanguages]);

  const getSelectedFilesList = useCallback(() => {
    const selectedFiles: VideoFile[] = [];
    const traverse = (list: VideoFile[]) => {
      list.forEach(item => {
        if (!item.is_directory && selectedIds.has(item.id)) selectedFiles.push(item);
        if (item.children) traverse(item.children);
      });
    };
    traverse(items);
    return selectedFiles;
  }, [items, selectedIds]);

  const selectedFiles = useMemo(() => getSelectedFilesList(), [getSelectedFilesList]);

  const handleProcess = useCallback(async (targetVideos: VideoFile[]) => {
    if (targetVideos.length === 0) return;

    const payload = {
      videos: targetVideos.map(v => {
        const currentWorkflow = resolveWorkflow(v.subtitleInfo, v.workflowMode || 'hybrid');
        
        let srtPath = "None";
        if (currentWorkflow === 'embedded') {
          srtPath = "Embedded";
        } else if (currentWorkflow === 'srt' || v.workflowMode === 'external') {
          srtPath = v.subtitleInfo?.srtPath || "None";
        }

        return {
          name: v.fileName,
          path: v.filePath,
          srtFoundPath: srtPath,
          src: v.sourceLang || 'auto',
          out: v.targetLanguages || [],
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

    console.log("🚀 JOB PAYLOAD:", JSON.stringify(payload, null, 2));
    
    targetVideos.forEach(v => updateVideoData(v.id, { status: 'processing' }));
    
    try {
      // await api.startJob(payload);
    } catch (err) {
      console.error("Job Failed:", err);
      targetVideos.forEach(v => updateVideoData(v.id, { status: 'idle' }));
    }
  }, [globalSettings, updateVideoData]);

  const toggleSelection = useCallback((id: string, isDir: boolean, children?: any[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const isAdding = !next.has(id);
      
      const apply = (tId: string, c?: any[]) => {
        isAdding ? next.add(tId) : next.delete(tId);
        if (c) c.forEach(child => apply(child.id, child.children));
      };
      
      apply(id, children);
      return next;
    });
  }, []);

  if (!mounted) return <div className="bg-[#0a0a0a] h-screen w-full" />;

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-slate-200">
      <Sidebar 
        currentPath={currentPath}
        onScanFolder={handleInitialDeepScan}
        isScanning={isScanning}
        globalSettings={globalSettings}
        setGlobalSettings={setGlobalSettings}
        onProcessAll={() => handleProcess(selectedFiles)}
        hasVideos={selectedFiles.length > 0} 
      />

      <main className="flex-1 relative overflow-hidden flex flex-col">
        <GlobalProgress videos={selectedFiles} />
        <div className="flex-1 overflow-auto p-6">
          <VideoList 
            videos={items} 
            isLoading={isScanning}
            onNavigate={setCurrentPath} 
            onStartJob={(video) => handleProcess([video])}
            onCancelJob={(id) => api.cancelJob(id)}
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