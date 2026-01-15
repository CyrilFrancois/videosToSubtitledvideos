"use client";

import React from 'react';
import { Folder, Play, Trash2, Layers, Languages, Check, Loader2 } from 'lucide-react';

export default function Sidebar({ 
  currentPath = "/data", 
  onScanFolder, 
  globalSettings, 
  setGlobalSettings, 
  onProcessAll,
  isScanning,
  hasVideos = false // This must be passed from page.tsx
}) {
  // Debug log to check the state inside the sidebar
  //console.log("SIDEBAR RENDER: hasVideos =", hasVideos, "| videos count:", hasVideos ? 'Active' : 'Empty');

  const languages = [
    { id: 'fr', label: 'French' },
    { id: 'en', label: 'English' },
    { id: 'es', label: 'Spanish' },
    { id: 'de', label: 'German' },
    { id: 'it', label: 'Italian' },
    { id: 'pt', label: 'Portuguese' }
  ];

  const toggleLanguage = (langId: string) => {
    const currentLangs = globalSettings?.targetLanguages || [];
    const updatedLangs = currentLangs.includes(langId)
      ? currentLangs.filter(id => id !== langId)
      : [...currentLangs, langId];

    setGlobalSettings({ ...globalSettings, targetLanguages: updatedLangs });
  };

  const cleanDisplayPath = currentPath === "/data" ? "Root" : currentPath.replace('/data/', '');

  return (
    <aside className="w-80 bg-[#0a0a0a] border-r border-white/10 flex flex-col p-6 z-20 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-10">
        <h1 className="text-xl font-bold text-white uppercase tracking-tighter">
          LEXI-STREAM <span className="text-indigo-500 text-xs block opacity-70">AI Auto-Sub</span>
        </h1>
      </div>

      <div className="space-y-8 flex-1">
        {/* Source Management */}
        <section>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 block">Library Source</label>
          <button 
            type="button"
            disabled={isScanning}
            onClick={(e) => {
              e.preventDefault();
              console.log("[UI]: Button clicked inside Sidebar.tsx");
              onScanFolder();
            }} 
            className={`w-full flex items-center justify-center gap-2 border p-3 rounded-xl transition-all font-medium ${
              isScanning 
              ? "bg-white/5 border-white/5 text-gray-500 cursor-not-allowed" 
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white active:scale-95 shadow-sm"
            }`}
          >
            {isScanning ? <Loader2 size={18} className="animate-spin text-indigo-500" /> : <Folder size={18} className="text-indigo-400" />}
            {isScanning ? "Scanning..." : "Sync Media Library"}
          </button> 

          <div className="mt-3 bg-white/5 rounded-xl border border-white/10 overflow-hidden text-[11px]">
             <div className="px-3 py-2 border-b border-white/5 bg-white/5 opacity-50 font-mono">
                <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Base Path</span>
                /media/library
             </div>
             <div className="px-3 py-2 bg-indigo-500/5 font-mono">
                <span className="text-[9px] text-indigo-500 uppercase font-bold block mb-1">Active Sub-path</span>
                <span className="text-indigo-300 font-bold">{cleanDisplayPath}</span>
             </div>
          </div>
        </section>

        {/* Translation Configuration - Greys out if hasVideos is false */}
        <section className={`space-y-4 transition-all duration-500 ${!hasVideos ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Translation Config</label>
          
          <div className="space-y-2">
            <span className="text-[11px] text-gray-400 flex items-center gap-2 mb-2"><Languages size={14}/> Target Languages</span>
            <div className="flex flex-wrap gap-2">
              {languages.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => toggleLanguage(lang.id)}
                  className={`px-3 py-1.5 rounded-full text-[10px] border transition-all flex items-center gap-1 ${
                    globalSettings?.targetLanguages?.includes(lang.id)
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(79,70,229,0.3)]"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                  }`}
                >
                  {globalSettings?.targetLanguages?.includes(lang.id) && <Check size={10} />}
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-[11px] text-gray-400 flex items-center gap-2"><Layers size={14}/> Whisper Model</span>
            <select 
              className="w-full bg-[#151515] border border-white/10 p-2.5 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500"
              value={globalSettings?.modelSize || "base"}
              onChange={(e) => setGlobalSettings({...globalSettings, modelSize: e.target.value})}
            >
              <option value="tiny">Tiny (Fastest)</option>
              <option value="base">Base (Recommended)</option>
              <option value="large-v3">Large-v3 (Accurate)</option>
            </select>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/5">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Mux into MKV</span>
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={globalSettings?.shouldMux}
                onChange={(e) => setGlobalSettings({...globalSettings, shouldMux: e.target.checked})}
              />
              <div className="w-8 h-4 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 relative flex items-center"></div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs text-red-400/80 group-hover:text-red-400 transition-colors flex items-center gap-2">
                <Trash2 size={14}/> Cleanup Original
              </span>
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={globalSettings?.shouldRemoveOriginal}
                onChange={(e) => setGlobalSettings({...globalSettings, shouldRemoveOriginal: e.target.checked})}
              />
              <div className="w-8 h-4 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 relative flex items-center"></div>
            </label>
          </div>
        </section>
      </div>

      <div className="pt-6 border-t border-white/10">
        <button 
          disabled={!hasVideos || isScanning}
          onClick={() => onProcessAll()}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 disabled:grayscale text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <Play size={18} fill="currentColor" />
          START BATCH
        </button>
      </div>
    </aside>
  );
}