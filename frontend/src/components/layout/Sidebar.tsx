"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, Play, Trash2, Layers, Volume2, Text,
  Check, Loader2, ChevronDown, Cpu, Zap
} from 'lucide-react';

function SidebarLanguageSelector({ label, selected, options, onToggle, isSingle = false, showAuto = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, [isOpen]);

  const displayValue = isSingle 
    ? (selected[0] === 'auto' ? 'Auto Detect' : options.find(o => o.id === selected[0])?.label || 'Select')
    : selected.map(id => id.toUpperCase()).join(', ') || 'None';

  const icon = label === "SRC" ? <Volume2 size={12} className="mr-2 text-gray-500" /> : <Text size={12} className="mr-2 text-gray-500" />;

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3 py-2.5 bg-black border border-white/10 rounded-lg text-[11px] font-mono hover:border-indigo-500/50 transition-colors ${isSingle ? 'text-blue-400' : 'text-indigo-400'}`}
      >
        <div className="flex items-center">
          {icon}
          <span className="text-gray-500 mr-2">{label}:</span> 
        </div>
        <span className="truncate flex-1 text-right mr-2 font-bold">{displayValue}</span>
        <ChevronDown size={12} className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl py-1 max-h-48 overflow-y-auto custom-scrollbar">
          {showAuto && (
            <div 
              onClick={() => { onToggle('auto'); setIsOpen(false); }}
              className="flex items-center justify-between px-3 py-2 hover:bg-indigo-500/10 cursor-pointer text-[10px] border-b border-white/5"
            >
              <span className={selected.includes('auto') ? 'text-blue-400' : 'text-gray-400'}>Auto Detect</span>
              {selected.includes('auto') && <Check size={12} className="text-blue-400" />}
            </div>
          )}
          {options.map(lang => (
            <div 
              key={lang.id}
              onClick={() => {
                onToggle(lang.id);
                if (isSingle) setIsOpen(false);
              }}
              className="flex items-center justify-between px-3 py-2 hover:bg-white/5 cursor-pointer text-[10px]"
            >
              <span className={selected.includes(lang.id) ? (isSingle ? 'text-blue-400' : 'text-indigo-400') : 'text-gray-400'}>
                {lang.label} ({lang.id.toUpperCase()})
              </span>
              {selected.includes(lang.id) && <Check size={12} className={isSingle ? 'text-blue-400' : 'text-indigo-400'} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ 
  currentPath = "/data", 
  onScanFolder, 
  globalSettings, 
  setGlobalSettings, 
  onProcessAll,
  isScanning,
  hasVideos = false 
}) {
  const basePath = process.env.NEXT_PUBLIC_MEDIA_PATH || "/data";

  const availableLanguages = React.useMemo(() => {
    try {
      const rawLangData = process.env.NEXT_PUBLIC_LANGUAGES || '{"English":"en"}';
      return Object.entries(JSON.parse(rawLangData)).map(([label, id]) => ({ id, label }));
    } catch (e) {
      return [{ id: 'en', label: 'English' }];
    }
  }, []);

  const cleanDisplayPath = currentPath === "/data" ? "Root" : currentPath.replace('/data/', '');

  return (
    <aside className="w-80 bg-[#0a0a0a] border-r border-white/10 flex flex-col p-6 z-20 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-10">
        <h1 className="text-xl font-bold text-white uppercase tracking-tighter">
          SubStudio <span className="text-indigo-500 text-xs block opacity-70">The Local Standard for Video Transcription.</span>
        </h1>
      </div>

      <div className="space-y-8 flex-1">
        {/* LIBRARY SECTION */}
        <section>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 block">Library Source</label>
          <button 
            type="button"
            disabled={isScanning}
            onClick={() => onScanFolder()} 
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
                <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Root</span>
                <span className="text-gray-400 truncate block">{basePath}</span>
             </div>
             <div className="px-3 py-2 bg-indigo-500/5 font-mono">
                <span className="text-[9px] text-indigo-500 uppercase font-bold block mb-1">Viewing</span>
                <span className="text-indigo-300 font-bold truncate block">{cleanDisplayPath}</span>
             </div>
          </div>
        </section>

        {/* CONFIG SECTION */}
        <section className={`space-y-6 transition-all duration-500 ${!hasVideos ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
          
          {/* LANGUAGE SETUP */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Language Setup</label>
            <div className="space-y-1.5">
              <SidebarLanguageSelector 
                label="SRC" 
                selected={globalSettings?.sourceLang || ['auto']} 
                options={availableLanguages} 
                onToggle={(id) => setGlobalSettings({
                  ...globalSettings, 
                  sourceLang: [id] // Force array format to match VideoCard state
                })} 
                isSingle 
                showAuto 
              />
              <SidebarLanguageSelector 
                label="OUT" 
                selected={globalSettings?.targetLanguages || []} 
                options={availableLanguages} 
                onToggle={(id) => {
                  const current = globalSettings?.targetLanguages || [];
                  const updated = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
                  setGlobalSettings({...globalSettings, targetLanguages: updated});
                }} 
              />
            </div>
          </div>

          {/* WORKFLOW MODE */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Workflow Mode</label>
            <div className="relative">
              <Zap size={12} className="absolute left-3 top-3.5 text-gray-500" />
              <select 
                className="w-full bg-black border border-white/10 p-2.5 pl-8 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 appearance-none font-mono cursor-pointer"
                value={globalSettings?.workflowMode || "hybrid"}
                onChange={(e) => setGlobalSettings({...globalSettings, workflowMode: e.target.value})}
              >
                <option value="hybrid">Smart: Use SRT (AI Fallback)</option>
                <option value="force_ai">Manual: Force AI Transcription</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-3.5 text-gray-600 pointer-events-none" />
            </div>
          </div>

          {/* WHISPER MODEL */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Whisper Model</label>
            <div className="relative">
              <Cpu size={12} className="absolute left-3 top-3.5 text-gray-500" />
              <select 
                className="w-full bg-black border border-white/10 p-2.5 pl-8 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 appearance-none font-mono"
                value={globalSettings?.modelSize || "base"}
                onChange={(e) => setGlobalSettings({...globalSettings, modelSize: e.target.value})}
              >
                <option value="tiny">Tiny (Fastest)</option>
                <option value="base">Base (Recommended)</option>
                <option value="large-v3">Large-v3 (Accurate)</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-3.5 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* SYSTEM SWITCHES */}
          <div className="space-y-3 pt-4 border-t border-white/5">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Generate SRT if missing</span>
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={globalSettings?.autoGenerate}
                onChange={(e) => setGlobalSettings({...globalSettings, autoGenerate: e.target.checked})}
              />
              <div className="w-8 h-4 bg-gray-800 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 relative flex items-center"></div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Mux into MKV</span>
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={globalSettings?.shouldMux}
                onChange={(e) => setGlobalSettings({...globalSettings, shouldMux: e.target.checked})}
              />
              <div className="w-8 h-4 bg-gray-800 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 relative flex items-center"></div>
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
              <div className="w-8 h-4 bg-gray-800 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 relative flex items-center"></div>
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