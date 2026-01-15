"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, Play, Trash2, Layers, Languages, 
  Check, Loader2, ChevronDown, X 
} from 'lucide-react';

export default function Sidebar({ 
  currentPath = "/data", 
  onScanFolder, 
  globalSettings, 
  setGlobalSettings, 
  onProcessAll,
  isScanning,
  hasVideos = false 
}) {
  const [isLangListOpen, setIsLangListOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Correct logic to load and parse data
  const basePath = process.env.NEXT_PUBLIC_MEDIA_PATH || "Not Set in .env";

  const getAvailableLanguages = () => {
    try {
      const rawLangData = process.env.NEXT_PUBLIC_LANGUAGES;
      if (!rawLangData) return [{ id: 'en', label: 'English' }]; 
      
      const languageDict = JSON.parse(rawLangData);
      return Object.entries(languageDict).map(([label, id]) => ({
        id: id as string,
        label
      }));
    } catch (e) {
      console.error("Failed to parse NEXT_PUBLIC_LANGUAGES", e);
      return [{ id: 'en', label: 'English' }];
    }
  };

  // Call the helper ONCE. This variable is used in the dropdown map and getSelectedLabels.
  const availableLanguages = getAvailableLanguages();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangListOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleLanguage = (langId: string) => {
    const currentLangs = globalSettings?.targetLanguages || [];
    const updatedLangs = currentLangs.includes(langId)
      ? currentLangs.filter(id => id !== langId)
      : [...currentLangs, langId];

    setGlobalSettings({ ...globalSettings, targetLanguages: updatedLangs });
  };

  const cleanDisplayPath = currentPath === "/data" ? "Root" : currentPath.replace('/data/', '');

  const getSelectedLabels = () => {
    const currentIds = globalSettings?.targetLanguages || [];
    return availableLanguages
      .filter(l => currentIds.includes(l.id))
      .map(l => l.label);
  };

  return (
    <aside className="w-80 bg-[#0a0a0a] border-r border-white/10 flex flex-col p-6 z-20 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-10">
        <h1 className="text-xl font-bold text-white uppercase tracking-tighter">
          LEXI-STREAM <span className="text-indigo-500 text-xs block opacity-70">AI Auto-Sub</span>
        </h1>
      </div>

      <div className="space-y-8 flex-1">
        <section>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 block">Library Source</label>
          <button 
            type="button"
            disabled={isScanning}
            onClick={(e) => {
              e.preventDefault();
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
                <span className="text-gray-400 truncate block">{basePath}</span>
             </div>
             <div className="px-3 py-2 bg-indigo-500/5 font-mono">
                <span className="text-[9px] text-indigo-500 uppercase font-bold block mb-1">Active Sub-path</span>
                <span className="text-indigo-300 font-bold truncate block">{cleanDisplayPath}</span>
             </div>
          </div>
        </section>

        <section className={`space-y-4 transition-all duration-500 ${!hasVideos ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Translation Config</label>
          
          <div className="space-y-2 relative" ref={dropdownRef}>
            <span className="text-[11px] text-gray-400 flex items-center gap-2 mb-2"><Languages size={14}/> Target Languages</span>
            
            <div 
              onClick={() => setIsLangListOpen(!isLangListOpen)}
              className="min-h-[42px] w-full bg-[#151515] border border-white/10 rounded-lg p-2 flex flex-wrap gap-1.5 cursor-pointer hover:border-white/20 transition-colors pr-8 relative"
            >
              {getSelectedLabels().length > 0 ? (
                getSelectedLabels().map(label => (
                  <span key={label} className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1">
                    {label}
                  </span>
                ))
              ) : (
                <span className="text-gray-600 text-[11px] italic">Select languages...</span>
              )}
              <ChevronDown size={14} className={`absolute right-2 top-3.5 text-gray-500 transition-transform ${isLangListOpen ? 'rotate-180' : ''}`} />
            </div>

            {isLangListOpen && (
              <div className="absolute top-full left-0 w-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl z-50 py-1 max-h-48 overflow-y-auto custom-scrollbar">
                {availableLanguages.map(lang => (
                  <div 
                    key={lang.id}
                    onClick={() => toggleLanguage(lang.id)}
                    className="flex items-center justify-between px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <span className={`text-xs ${globalSettings?.targetLanguages?.includes(lang.id) ? 'text-indigo-400' : 'text-gray-400'}`}>
                      {lang.label}
                    </span>
                    {globalSettings?.targetLanguages?.includes(lang.id) && <Check size={14} className="text-indigo-500" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-[11px] text-gray-400 flex items-center gap-2"><Layers size={14}/> Whisper Model</span>
            <select 
              className="w-full bg-[#151515] border border-white/10 p-2.5 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 appearance-none"
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