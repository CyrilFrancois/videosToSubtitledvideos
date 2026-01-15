import React from 'react';
import { Folder, Play, Settings, Cpu, ChevronRight } from 'lucide-react';

export default function Sidebar({ 
  currentPath, 
  onScanFolder, 
  globalSettings, 
  setGlobalSettings, 
  onProcessAll,
  isScanning 
}) {
  return (
    <aside className="w-80 bg-[#0a0a0a] border-r border-white/10 flex flex-col p-6 z-20">
      <div className="flex items-center gap-3 mb-12">
        <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]">
          <Cpu size={24} className="text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          MEDIA AI <span className="text-blue-500 text-xs block font-normal tracking-widest uppercase text-opacity-70">Pipeline</span>
        </h1>
      </div>

      <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <section>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 block">Source Management</label>
          <button 
            onClick={onScanFolder}
            disabled={isScanning}
            className={`w-full flex items-center justify-center gap-2 border p-3 rounded-xl transition-all text-sm font-medium group ${
              isScanning 
              ? "bg-white/5 border-white/5 text-gray-500 cursor-not-allowed" 
              : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
            }`}
          >
            <Folder size={18} className={`${isScanning ? 'text-gray-500' : 'text-blue-400 group-hover:scale-110'} transition-transform`} />
            {isScanning ? "Scanning..." : "Initialize Library Scan"}
          </button>
          
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-[9px] text-gray-500 uppercase font-bold px-1">Active Mount</span>
            <p className="text-[11px] text-blue-400 font-mono truncate bg-blue-500/5 p-2 rounded border border-blue-500/20">
              {currentPath}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 block">AI Configuration</label>
          
          <div className="space-y-2">
            <span className="text-xs text-gray-400 px-1">Target Language</span>
            <select 
              className="w-full bg-[#151515] border border-white/10 p-2.5 rounded-lg text-sm text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              value={globalSettings.targetLanguage}
              onChange={(e) => setGlobalSettings({...globalSettings, targetLanguage: e.target.value})}
            >
              <option value="fr">French (Standard)</option>
              <option value="en">English (International)</option>
              <option value="es">Spanish</option>
              <option value="de">German</option>
            </select>
          </div>

          <div className="pt-2 space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group">
              <span className="text-sm text-gray-400 group-hover:text-gray-200">Mux MKV Container</span>
              <div className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={globalSettings.shouldMux}
                  onChange={(e) => setGlobalSettings({...globalSettings, shouldMux: e.target.checked})}
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
            </label>
          </div>
        </section>
      </div>

      <div className="pt-6 border-t border-white/10">
        <button 
          onClick={onProcessAll}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Play size={18} fill="currentColor" />
          START BATCH
        </button>
      </div>
    </aside>
  );
}