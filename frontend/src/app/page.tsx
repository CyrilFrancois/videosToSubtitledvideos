"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlobalProgress from '@/components/dashboard/GlobalProgress';
import VideoList from '@/components/dashboard/VideoList';
import { api } from '@/lib/api';
import { VideoFile, GlobalSettings, StudioState } from '@/lib/types';
import { createSSEConnection, SSEEvent } from '@/lib/sse';
import { Terminal, Bug, X } from 'lucide-react';

// --- CONTEXT DEFINITION ---
const StudioContext = createContext<{
  state: StudioState;
  actions: any;
} | null>(null);

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) throw new Error("useStudio must be used within StudioContext");
  return context;
};

// --- DEBUGGER COMPONENT ---
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
    <button 
      onClick={() => setIsVisible(true)}
      className="fixed bottom-0 right-0 w-4 h-4 opacity-0 hover:opacity-100 z-[9999] cursor-help"
    />
  );

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] bg-black/95 border-l border-white/10 z-[10000] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 backdrop-blur-xl">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] font-bold tracking-tighter">
          <Terminal size={14} /> REACT_MASTER_STATE_V3
        </div>
        <button onClick={() => setIsVisible(false)} className="text-gray-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        <pre className="text-[10px] font-mono text-emerald-500/90 leading-tight">
          {JSON.stringify(state, (key, value) => value instanceof Set ? Array.from(value) : value, 2)}
        </pre>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const activeListeners = useRef<Record<string, EventSource>>({});

  const [state, setState] = useState<StudioState>({
    items: [],
    selectedIds: new Set(),
    logs: {},
    isScanning: false,
    currentPath: "/data",
    settings: {
      sourceLang: ['auto'],
      targetLanguages: ['fr'], 
      workflowMode: 'hybrid',
      modelSize: 'base',
      autoGenerate: true,
      shouldMux: true,
      shouldRemoveOriginal: false
    }
  });

  // Helper: Find and update a video object inside a nested tree
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

  // SSE Management
  const subscribeToUpdates = useCallback((fileId: string) => {
    if (activeListeners.current[fileId]) activeListeners.current[fileId].close();

    const eventSource = createSSEConnection(
      fileId,
      (data: SSEEvent) => {
        if (data.type === 'status') {
          updateVideoInList(data.fileId, {
            status: data.status,
            progress: data.progress,
            statusText: data.message 
          });
          if (['done', 'error', 'cancelled'].includes(data.status)) {
            eventSource.close();
            delete activeListeners.current[fileId];
          }
        } else if (data.type === 'log') {
          setState(prev => ({
            ...prev,
            logs: { ...prev.logs, [data.fileId]: [...(prev.logs[data.fileId] || []), data.message].slice(-100) }
          }));
        }
      },
      () => delete activeListeners.current[fileId]
    );
    activeListeners.current[fileId] = eventSource;
  }, [updateVideoInList]);

  // Actions exposed to the UI
  const actions = useMemo(() => ({
    setSettings: (updates: Partial<GlobalSettings>) => 
      setState(prev => ({ ...prev, settings: { ...prev.settings, ...updates } })),

    navigate: (path: string) => setState(prev => ({ ...prev, currentPath: path })),

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

    scan: async () => {
      setState(prev => ({ ...prev, isScanning: true }));
      try {
        const data = await api.scanFolder(state.currentPath, true);
        const process = (files: any[]): VideoFile[] => files.map(f => ({
          ...f, id: f.filePath, status: f.is_directory ? 'folder' : 'idle', progress: 0,
          children: f.is_directory ? process(f.children || []) : null
        }));
        setState(prev => ({ ...prev, items: process(data.files || []), isScanning: false }));
      } catch (e) {
        setState(prev => ({ ...prev, isScanning: false }));
      }
    },

    process: async (targetVideos: VideoFile[]) => {
      if (targetVideos.length === 0) return;

      setState(prev => {
        const newLogs = { ...prev.logs };
        targetVideos.forEach(v => { newLogs[v.filePath] = []; });
        return { ...prev, logs: newLogs };
      });

      const payload = {
        videos: targetVideos.map(v => ({
          name: v.fileName,
          path: v.filePath,
          src: v.sourceLang?.[0] || 'auto',
          out: state.settings.targetLanguages,
          workflowMode: state.settings.workflowMode,
        })),
        globalOptions: {
          transcriptionEngine: state.settings.modelSize,
          generateSRT: state.settings.autoGenerate,
          muxIntoMkv: state.settings.shouldMux,
          cleanUp: state.settings.shouldRemoveOriginal
        }
      };

      targetVideos.forEach(v => {
        updateVideoInList(v.id, { status: 'processing', progress: 5 });
        subscribeToUpdates(v.filePath);
      });

      try { await api.startJob(payload); } 
      catch (err) { targetVideos.forEach(v => updateVideoInList(v.id, { status: 'error' })); }
    }
  }), [state.settings, state.currentPath, subscribeToUpdates, updateVideoInList]);

  useEffect(() => {
    setMounted(true);
    actions.scan();
    return () => Object.values(activeListeners.current).forEach(es => es.close());
  }, []);

  const selectedFilesList = useMemo(() => {
    const selected: VideoFile[] = [];
    const traverse = (list: VideoFile[]) => {
      list.forEach(item => {
        if (!item.is_directory && state.selectedIds.has(item.id)) selected.push(item);
        if (item.children) traverse(item.children);
      });
    };
    traverse(state.items);
    return selected;
  }, [state.items, state.selectedIds]);

  if (!mounted) return null;

  return (
    <StudioContext.Provider value={{ state, actions }}>
      <div className="flex h-screen w-full bg-[#0a0a0a] text-slate-200 overflow-hidden">
        <Sidebar 
          onProcessAll={() => actions.process(selectedFilesList)}
          hasSelection={state.selectedIds.size > 0} 
        />

        <main className="flex-1 relative flex flex-col overflow-hidden">
          <GlobalProgress />
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <VideoList videos={state.items} />
          </div>
        </main>

        <AppStatusDebugger />
      </div>
    </StudioContext.Provider>
  );
}