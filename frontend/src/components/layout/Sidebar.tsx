"use client";

import React from 'react';
import { 
  FolderOpen, 
  Settings, 
  Play, 
  ChevronRight, 
  Trash2, 
  FileBox, 
  Languages 
} from 'lucide-react';

interface SidebarProps {
  onScanFolder: () => void;
  currentPath: string;
  globalSettings: any;
  setGlobalSettings: (settings: any) => void;
  onProcessAll: () => void;
}

export default function Sidebar({ 
  onScanFolder, 
  currentPath, 
  globalSettings, 
  setGlobalSettings, 
  onProcessAll 
}: SidebarProps) {
  
  const handleSettingChange = (key: string, value: any) => {
    setGlobalSettings({ ...globalSettings, [key]: value });
  };

  return (
    <aside className="w-80 h-full border-r border-white/10 bg-[#0f0f0f] flex flex-col sticky top-0 shrink-0 z-20">
      {/* App Brand */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
            <Play size={18} className="text-white fill-current ml-0.5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            AI MEDIA <span className="text-green-500">SUITE</span>
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10">
        {/* 1. SOURCE SELECTION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
            <FolderOpen size={14} /> <span>Source Selection</span>
          </div>
          <button 
            onClick={onScanFolder}
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium flex items-center justify-between transition-all group"
          >
            <span className="group-hover:text-green-400 transition-colors">Select Root Folder</span>
            <ChevronRight size={14} className="text-gray-500" />
          </button>
          <div className="p-3 bg-black/40 rounded-lg border border-white/5 text-[11px] font-mono text-gray-400 break-all leading-relaxed">
            {currentPath || "No directory selected"}
          </div>
        </section>

        {/* 2. GLOBAL PROCESSING OPTIONS */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
            <Settings size={14} /> <span>Global Config</span>
          </div>
          
          <div className="space-y-4">
            {/* Muxing Toggle */}
            <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-transparent hover:border-white/10 cursor-pointer transition-all">
              <div className="flex items-center gap-3">
                <FileBox size={18} className="text-blue-400" />
                <span className="text-sm font-medium text-gray-200">Generate MKV</span>
              </div>
              <input 
                type="checkbox" 
                checked={globalSettings.shouldMux}
                onChange={(e) => handleSettingChange('shouldMux', e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-transparent text-green-500 focus:ring-0" 
              />
            </label>

            {/* Language Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <Languages size={14} /> <span>Target Languages</span>
              </div>
              <select 
                value={globalSettings.targetLanguage}
                onChange={(e) => handleSettingChange('targetLanguage', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-green-500/50 appearance-none"
              >
                <option value="fr">French (Français)</option>
                <option value="en">English</option>
                <option value="es">Spanish (Español)</option>
                <option value="de">German (Deutsch)</option>
                <option value="jp">Japanese (日本語)</option>
              </select>
            </div>

            {/* Cleanup Toggle */}
            <label className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-transparent hover:border-red-500/20 cursor-pointer transition-all group">
              <div className="flex items-center gap-3">
                <Trash2 size={18} className="text-red-400/70 group-hover:text-red-400" />
                <span className="text-sm font-medium text-gray-300">Clean Old Files</span>
              </div>
              <input 
                type="checkbox" 
                checked={globalSettings.shouldRemoveOriginal}
                onChange={(e) => handleSettingChange('shouldRemoveOriginal', e.target.checked)}
                className="w-4 h-4 rounded border-white/10 bg-transparent text-red-500 focus:ring-0" 
              />
            </label>
          </div>
        </section>
      </div>

      {/* 3. EXECUTION FOOTER */}
      <div className="p-6 border-t border-white/10 bg-[#0c0c0c]">
        <button 
          onClick={onProcessAll}
          className="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-[0.98] text-white font-bold rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-green-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!currentPath}
        >
          <Play size={18} fill="currentColor" />
          START BATCH
        </button>
        <p className="text-[10px] text-gray-500 text-center mt-3">
          Processing using OpenAI Whisper (Base)
        </p>
      </div>
    </aside>
  );
}