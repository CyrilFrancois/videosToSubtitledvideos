"use client"; // Ensure this is at the VERY top

import React from 'react';
import { Folder, Play, Cpu, Trash2, Layers, Languages, Check } from 'lucide-react';

export default function Sidebar({ 
  currentPath = "/data", 
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
    { id: 'de', label: 'German' }
  ];

  const toggleLanguage = (langId: string) => {
    console.log("!!! CLICK DETECTED: Language", langId);
    const currentLangs = globalSettings?.targetLanguages || [];
    const updatedLangs = currentLangs.includes(langId)
      ? currentLangs.filter(id => id !== langId)
      : [...currentLangs, langId];

    setGlobalSettings({ ...globalSettings, targetLanguages: updatedLangs });
  };

  return (
    <aside className="w-80 bg-[#0a0a0a] border-r border-white/10 flex flex-col p-6 z-20 h-full">
      <div className="mb-10">
        <h1 className="text-xl font-bold text-white uppercase tracking-tighter">
          LEXI-STREAM <span className="text-indigo-500 text-xs block opacity-70">AI Auto-Sub</span>
        </h1>
      </div>

      <div className="space-y-8 flex-1">
        <section>
          <label className="text-[10px] font-bold text-gray-500 uppercase mb-4 block">Library Source</label>
          <button 
            type="button"
            onClick={() => {
              console.log("!!! CLICK DETECTED: Sync Button");
              onScanFolder();
            }} 
            className="w-full flex items-center justify-center gap-2 border border-white/10 p-3 rounded-xl bg-white/5 text-white active:bg-white/20"
          >
            <Folder size={18} className="text-indigo-400" />
            Sync Media Library
          </button> 
        </section>

        <section>
          <label className="text-[10px] font-bold text-gray-500 uppercase mb-4 block">Languages</label>
          <div className="flex flex-wrap gap-2">
            {languages.map(lang => (
              <button
                key={lang.id}
                onClick={() => toggleLanguage(lang.id)}
                className={`px-3 py-1.5 rounded-full text-[10px] border transition-all ${
                  globalSettings?.targetLanguages?.includes(lang.id)
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-white/5 border-white/10 text-gray-400"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="pt-6 border-t border-white/10">
        <button 
          onClick={() => {
            console.log("!!! CLICK DETECTED: Start Batch");
            onProcessAll();
          }}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold"
        >
          START PROCESSING
        </button>
      </div>
    </aside>
  );
}