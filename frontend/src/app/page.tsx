"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import Sidebar from '@/components/layout/Sidebar'; 
import GlobalProgress from '@/components/dashboard/GlobalProgress';
import VideoList from '@/components/dashboard/VideoList';
import { api } from '@/lib/api';
import { VideoFile, GlobalSettings, StudioState } from '@/lib/types';
import { createSSEConnection, SSEEvent } from '@/lib/sse';
import { Terminal, Bug, X } from 'lucide-react';

// --- CONTEXT ---
export const StudioContext = createContext<{
  state: StudioState;
  actions: any;
} | null>(null);

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) throw new Error("useStudio must be used within StudioContext");
  return context;
};

// --- DEBUGGER ---
function AppStatusDebugger() {
  const { state } = useStudio();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') setIsVisible(v => !v);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible) return (
    <button onClick={() => setIsVisible(true)} className="fixed bottom-2 right-2 w-6 h-6 opacity-20 hover:opacity-100 z-[9999] flex items-center justify-center text-white bg-white/10 rounded-full transition-all">
      <Bug size={12} />
    </button>
  );

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-[500px] bg-[#050505] border-l border-white/10 z-[10000] shadow-2xl flex flex-col">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] font-bold tracking-widest">
          <Terminal size={14} /> SYSTEM_DEBUG_STDOUT
        </div>
        <button onClick={() => setIsVisible(false)} className="text-gray-500 hover:text-white p-1"><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-auto p-6 custom-scrollbar">
        <pre className="text-[10px] font-mono text-emerald-500/90 whitespace-pre-wrap">
          {JSON.stringify(state, (k, v) => v instanceof Set ? Array.from(v) : v, 2)}
        </pre>
      </div>
    </div>
  );
}

// --- DASHBOARD LAYOUT ---
function DashboardContent() {
  const { state } = useStudio();
  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-slate-200 overflow-hidden">
      <Sidebar />
      <main className="flex-1 relative flex flex-col overflow-hidden">
        <GlobalProgress />
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <VideoList videos={state.items} />
        </div>
      </main>
      <AppStatusDebugger />
    </div>
  );
}

// --- ROOT PAGE ---
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const activeListeners = useRef<Record<string, EventSource>>({});
  const hasInitialScanned = useRef(false);

  const [state, setState] = useState<StudioState>({
    items: [],
    selectedIds: new Set(),
    logs: {},
    isScanning: false,
    currentPath: "/data",
    settings: {
      sourceLang: ['auto'],
      targetLanguages: ['fr'], 
      workflowMode: 'whisper', // 'hybrid', 'whisper', 
      modelSize: 'medium',
      autoGenerate: true,
      shouldMux: true,
      shouldRemoveOriginal: false,
      stripExistingSubs: false 
    }
  });

  // 1. RECURSIVE UPDATE HELPER
  const updateVideoInList = useCallback((id: string, updates: Partial<VideoFile>) => {
    setState(prev => {
      const updateRecursive = (list: VideoFile[]): VideoFile[] => {
        return list.map(item => {
          if (item.id === id || item.filePath === id) return { ...item, ...updates };
          if (item.children) return { ...item, children: updateRecursive(item.children) };
          return item;
        });
      };
      return { ...prev, items: updateRecursive(prev.items) };
    });
  }, []);

  // 2. STABLE SCAN ACTION
  const performScan = useCallback(async (path: string) => {
    if (state.isScanning) return; 

    setState(prev => ({ ...prev, isScanning: true }));
    try {
      const data = await api.scanFolder(path);
      setState(prev => {
        const process = (files: any[]): VideoFile[] => files.map(f => ({
          ...f, 
          id: f.filePath, 
          status: f.is_directory ? 'folder' : 'idle', 
          progress: 0,
          sourceLang: prev.settings.sourceLang,
          targetLanguages: prev.settings.targetLanguages,
          workflowMode: prev.settings.workflowMode,
          stripExistingSubs: prev.settings.stripExistingSubs,
          selectedSrtPath: null, // Initialized as null
          children: f.is_directory ? process(f.children || []) : null
        }));
        return { ...prev, items: process(data.files || []), isScanning: false };
      });
    } catch (e) {
      console.error("Scan Failed:", e);
      setState(prev => ({ ...prev, isScanning: false }));
    }
  }, [state.isScanning]);

  // 3. SSE MANAGEMENT
  const subscribeToUpdates = useCallback((fileId: string) => {
    if (activeListeners.current[fileId]) activeListeners.current[fileId].close();

    // Ensure we URL-encode the fileId to avoid breaks in the connection
    const encodedId = encodeURIComponent(fileId);
    
    const es = createSSEConnection(encodedId, (data: SSEEvent) => {
      if (data.type === 'status') {
        updateVideoInList(fileId, {
          status: data.status,
          progress: data.progress,
          statusText: data.message 
        });
        if (['done', 'error', 'cancelled'].includes(data.status)) {
          es.close();
          delete activeListeners.current[fileId];
        }
      }
    }, () => delete activeListeners.current[fileId]);
    
    activeListeners.current[fileId] = es;
  }, [updateVideoInList]);

  // 4. COMBINED ACTIONS
  const actions = useMemo(() => ({
    navigate: (path: string) => {
      setState(prev => ({ ...prev, currentPath: path }));
      performScan(path);
    },
    
    setSettings: (updates: Partial<GlobalSettings>) => {
      setState(prev => {
        const nextSettings = { ...prev.settings, ...updates };
        const videoUpdates: Partial<VideoFile> = {};
        if (updates.sourceLang) videoUpdates.sourceLang = updates.sourceLang;
        if (updates.targetLanguages) videoUpdates.targetLanguages = updates.targetLanguages;
        if (updates.workflowMode) videoUpdates.workflowMode = updates.workflowMode;
        if (updates.stripExistingSubs !== undefined) videoUpdates.stripExistingSubs = updates.stripExistingSubs;

        const applyToAll = (list: VideoFile[]): VideoFile[] => list.map(item => ({
          ...item, ...videoUpdates,
          children: item.children ? applyToAll(item.children) : null
        }));

        return { ...prev, settings: nextSettings, items: applyToAll(prev.items) };
      });
    },

    updateVideoData: (id: string, updates: Partial<VideoFile>) => updateVideoInList(id, updates),

    toggleSelection: (id: string, isDir: boolean, children?: any[]) => {
      setState(prev => {
        const next = new Set(prev.selectedIds);
        const isAdding = !next.has(id);
        const apply = (tId: string, c?: any[]) => {
          isAdding ? next.add(tId) : next.delete(tId);
          if (c) c.forEach(child => apply(child.filePath, child.children));
        };
        apply(id, children);
        return { ...prev, selectedIds: next };
      });
    },

    scan: () => performScan(state.currentPath),

    process: async (targetVideos: VideoFile[]) => {
      const videosToStart = targetVideos.filter(v => v.status !== 'processing');
      if (videosToStart.length === 0) return;
      
      const payload = {
        videos: videosToStart.map(v => ({
          name: v.fileName,
          path: v.filePath,
          selectedSrtPath: v.selectedSrtPath || null, // SENDING CUSTOM SRT
          src: v.sourceLang?.[0] || state.settings.sourceLang[0],
          out: v.targetLanguages || state.settings.targetLanguages,
          workflowMode: v.workflowMode || state.settings.workflowMode,
          syncOffset: v.syncOffset || 0,
          stripExistingSubs: v.stripExistingSubs ?? state.settings.stripExistingSubs,
        })),
        globalOptions: {
          transcriptionEngine: state.settings.modelSize,
          generateSRT: state.settings.autoGenerate,
          muxIntoMkv: state.settings.shouldMux,
          cleanUp: state.settings.shouldRemoveOriginal
        }
      };

      // Set UI state immediately
      videosToStart.forEach(v => {
        updateVideoInList(v.id, { status: 'processing', progress: 5, statusText: 'Initializing...' });
        subscribeToUpdates(v.filePath);
      });

      try {
        await api.startJob(payload);
      } catch (err) {
        console.error("Job start failed:", err);
        videosToStart.forEach(v => {
          updateVideoInList(v.id, { status: 'error', statusText: 'Failed to connect to server' });
        });
      }
    }
  }), [performScan, subscribeToUpdates, updateVideoInList, state.currentPath, state.settings]);

  // 5. LIFECYCLE
  useEffect(() => {
    setMounted(true);
    if (!hasInitialScanned.current) {
      performScan("/data"); 
      hasInitialScanned.current = true;
    }

    return () => {
      Object.values(activeListeners.current).forEach(es => es.close());
    };
  }, [performScan]); 

  if (!mounted) return <div className="h-screen w-full bg-[#0a0a0a]" />;

  return (
    <StudioContext.Provider value={{ state, actions }}>
      <DashboardContent />
    </StudioContext.Provider>
  );
}