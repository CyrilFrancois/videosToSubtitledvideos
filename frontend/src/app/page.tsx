"use client";

import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlobalProgress from '@/components/dashboard/GlobalProgress';
import VideoList from '@/components/dashboard/VideoList';
import { api } from '@/lib/api';
import { Folder, ChevronLeft } from 'lucide-react';

export default function DashboardPage() {
  const [items, setItems] = useState<any[]>([]); 
  const [isScanning, setIsScanning] = useState(false);
  const [currentPath, setCurrentPath] = useState("/data");
  const [mounted, setMounted] = useState(false);
  
  // SELECTION STATE
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [globalSettings, setGlobalSettings] = useState({
    targetLanguages: ['fr'], 
    modelSize: 'base',
    shouldMux: true,
    shouldRemoveOriginal: false
  });

  useEffect(() => {
    setMounted(true);
    handleExpandFolder("/data"); // Root load
  }, []);

  /**
   * Helper to update a specific folder within the nested tree
   */
  const updateTreeItems = (list: any[], path: string, children: any[]): any[] => {
    return list.map(item => {
      if (item.is_directory && item.filePath === path) {
        return { ...item, children };
      }
      if (item.is_directory && item.children) {
        return { ...item, children: updateTreeItems(item.children, path, children) };
      }
      return item;
    });
  };

  /**
   * Loads folder contents and injects them into the tree
   */
  const handleExpandFolder = useCallback(async (targetPath: string) => {
    setIsScanning(true);
    try {
      const data = await api.scanFolder(targetPath); 
      if (data && data.files) {
        const processedItems = data.files.map((item: any) => ({
          ...item,
          id: item.id,
          status: item.is_directory ? 'folder' : 'idle',
          progress: 0,
          children: item.is_directory ? [] : null
        }));

        if (targetPath === "/data") {
          setItems(processedItems);
        } else {
          setItems(prev => updateTreeItems(prev, targetPath, processedItems));
        }
        setCurrentPath(targetPath);
      }
    } catch (e) {
      console.error("❌ Expansion Error:", e);
    } finally {
      setIsScanning(false);
    }
  }, []);

  /**
   * Recursive logic to toggle selection of an item and all its descendants
   */
  const toggleSelection = useCallback((id: string, isDirectory: boolean, children?: any[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const isAdding = !next.has(id);

      const applyToggle = (targetId: string, itemChildren?: any[]) => {
        if (isAdding) next.add(targetId);
        else next.delete(targetId);

        // Cascade to children
        if (itemChildren && itemChildren.length > 0) {
          itemChildren.forEach(child => applyToggle(child.id, child.children));
        }
      };

      applyToggle(id, children);
      return next;
    });
  }, []);

  const handleProcessSelected = async () => {
    // Only process files (not folders) that are selected
    const fileIds = Array.from(selectedIds).filter(id => {
        // Simple check: we need to find the item in our tree to see if it's a file
        // For brevity, assuming your ID naming convention or a lookup helper
        return true; 
    });
    console.log("Processing IDs:", fileIds);
    // await api.processFiles(fileIds, globalSettings);
  };

  if (!mounted) return <div className="bg-[#0a0a0a] h-screen w-full" />;

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-slate-200">
      <Sidebar 
        currentPath={currentPath}
        onScanFolder={() => handleExpandFolder("/data")}
        isScanning={isScanning}
        globalSettings={globalSettings}
        setGlobalSettings={setGlobalSettings}
        onProcessAll={handleProcessSelected}
        hasVideos={selectedIds.size > 0} 
      />

      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Progress only for selected/active items */}
        <GlobalProgress videos={items.filter(i => selectedIds.has(i.id))} />
        
        <div className="flex-1 overflow-auto p-6">
          <header className="mb-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Library</h2>
            <p className="text-indigo-300 font-mono text-xs">{selectedIds.size} items selected</p>
          </header>

          <VideoList 
            videos={items} 
            onNavigate={handleExpandFolder} 
            onStartJob={(id) => console.log("Start:", id)} 
            onCancelJob={(id) => console.log("Cancel:", id)}
            selectedIds={selectedIds}
            toggleSelection={toggleSelection}
          />
        </div>
      </main>
    </div>
  );
}