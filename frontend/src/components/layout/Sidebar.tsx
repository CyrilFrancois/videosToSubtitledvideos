import React from 'react';
import { Folder, Play, Cpu, Trash2, Layers, Languages } from 'lucide-react';

export default function Sidebar({ 
  currentPath, 
  onScanFolder, 
  globalSettings, 
  setGlobalSettings, 
  onProcessAll,
  isScanning 
}) {
  const languages = [
    { id: 'fr', label: 'French' },
    { id: 'en', label: 'English' },
    { id: 'es', label: 'Spanish' },
    { id: 'de', label: 'German' },
    { id: 'it', label: 'Italian' },
    { id: 'pt', label: 'Portuguese' }
  ];

  const toggleLanguage = (langId) => {
    const current = globalSettings.targetLanguages || [];
    const updated = current.includes(langId)
      ? current.filter(id => id !== langId)
      : [...current, langId];
    setGlobalSettings({ ...globalSettings, targetLanguages: updated });
  };

  return (
    <aside className="w-80 bg-[#0a0a0a] border-r border-white/10 flex flex-col p-6 z-20">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-10">
        <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]">
          <Cpu size={24} className="text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          MEDIA AI <span className="text-blue-500 text-xs block font-normal tracking-widest uppercase opacity-70">Pipeline</span>
        </h1>
      </div>

      <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Source Management */}
        <section>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 block">Source Management</label>
          <button 
            onClick={() => onScanFolder()} 
            disabled={isScanning}
            className={`w-full flex items-center justify-center gap-2 border p-3 rounded-xl transition-all text-sm font-medium group ${
              isScanning 
              ? "bg-white/5 border-white/5 text-gray-400" 
              : "bg-white/5 hover:bg-white/10 border-white/10 text-white shadow-sm"
            }`}
          >
            <Folder size={18} className={`${isScanning ? 'animate-pulse' : 'text-blue-400'}`} />
            {isScanning ? "Scanning..." : "Select Folder"}
          </button> 
          
          <div className="mt-3 bg-white/5 rounded-xl border border-white/10 overflow-hidden">
             <div className="px-3 py-2 border-b border-white/5 bg-white/5">
                <span className="text-[9px] text-gray-500 uppercase font-bold">Base Path (Env)</span>
                <p className="text-[11px] text-gray-400 font-mono truncate">/media/library</p>
             </div>
             <div className="px-3 py-2">
                <span className="text-[9px] text-blue-500 uppercase font-bold">Selected Sub-path</span>
                <p className="text-[11px] text-blue-400 font-mono truncate">
                  {currentPath || "Root"}
                </p>
             </div>
          </div>
        </section>

        {/* Subtitles Configuration */}
        <section className="space-y-4">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Subtitles Configuration</label>
          
          {/* Multi-Language Selector */}
          <div className="space-y-2">
            <span className="text-[11px] text-gray-400 flex items-center gap-2"><Languages size={14}/> Target Languages</span>
            <div className="grid grid-cols-2 gap-2">
              {languages.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => toggleLanguage(lang.id)}
                  className={`px-2 py-1.5 rounded-md text-[11px] border transition-all ${
                    globalSettings.targetLanguages?.includes(lang.id)
                    ? "bg-blue-600/20 border-blue-500 text-blue-400"
                    : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selector */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] text-gray-400 flex items-center gap-2"><Layers size={14}/> Whisper Model</span>
            <select 
              className="w-full bg-[#151515] border border-white/10 p-2 rounded-lg text-xs text-gray-200 outline-none focus:border-blue-500"
              value={globalSettings.modelSize}
              onChange={(e) => setGlobalSettings({...globalSettings, modelSize: e.target.value})}
            >
              <option value="tiny">Tiny (Fastest)</option>
              <option value="base">Base (Recommended)</option>
              <option value="large-v3">Large-v3 (Accurate)</option>
            </select>
          </div>

          {/* Switches */}
          <div className="space-y-3 pt-4">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Mux into MKV</span>
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={globalSettings.shouldMux}
                onChange={(e) => setGlobalSettings({...globalSettings, shouldMux: e.target.checked})}
              />
              <div className="w-8 h-4 bg-gray-700 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 relative flex items-center px-0.5"></div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs text-red-400/80 group-hover:text-red-400 transition-colors flex items-center gap-2">
                <Trash2 size={14}/> Cleanup Original
              </span>
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={globalSettings.shouldRemoveOriginal}
                onChange={(e) => setGlobalSettings({...globalSettings, shouldRemoveOriginal: e.target.checked})}
              />
              <div className="w-8 h-4 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 relative flex items-center px-0.5"></div>
            </label>
          </div>
        </section>
      </div>

      <div className="pt-6 border-t border-white/10">
        <button 
          onClick={onProcessAll}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Play size={18} fill="currentColor" />
          START BATCH
        </button>
      </div>
    </aside>
  );
}