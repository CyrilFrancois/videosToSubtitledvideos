"use client";

import React, { useMemo } from 'react';
import { useStudio } from '@/app/page';
import { 
  Folder, Play, Trash2, Volume2, Text,
  Check, Loader2, ChevronDown, Cpu, Zap, Settings, ShieldAlert
} from 'lucide-react';
import { VideoFile } from '@/lib/types';

/**
 * Clean, stateless Language Selector component
 */
function LanguageDropdown({ label, selected, options, isSingle = false, onToggle }: any) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const displayValue = isSingle 
    ? (selected[0] === 'auto' ? 'Auto Detect' : options.find((o: any) => o.id === selected[0])?.label || 'Select')
    : selected.map((id: string) => id.toUpperCase()).join(', ') || 'None';

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-[11px] hover:border-indigo-500/50 transition-all"
      >
        <div className="flex items-center gap-2">
          {label === "SRC" ? <Volume2 size={12} className="text-gray-500" /> : <Text size={12} className="text-gray-500" />}
          <span className="text-gray-500 font-bold">{label}:</span> 
          <span className="text-indigo-400 font-bold truncate">{displayValue}</span>
        </div>
        <ChevronDown size={12} className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute z-40 w-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl py-1 max-h-48 overflow-y-auto custom-scrollbar">
            {options.map((lang: any) => (
              <div 
                key={lang.id}
                onClick={() => {
                  onToggle(lang.id);
                  if (isSingle) setIsOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2 hover:bg-indigo-500/10 cursor-pointer text-[10px]"
              >
                <span className={selected.includes(lang.id) ? 'text-indigo-400 font-bold' : 'text-gray-400'}>
                  {lang.label}
                </span>
                {selected.includes(lang.id) && <Check size={12} className="text-indigo-400" />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { state, actions } = useStudio();
  const { settings, isScanning, selectedIds, items } = state;

  const availableLanguages = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_LANGUAGES || '{"English":"en", "French":"fr", "Spanish":"es", "German":"de", "Japanese":"ja"}';
    return Object.entries(JSON.parse(raw)).map(([label, id]) => ({ id, label }));
  }, []);

  /**
   * RECURSIVE HELPER: Get all selected VIDEO files
   * We filter out directories so the count and the processing queue are accurate.
   */
  const selectedVideos = useMemo(() => {
    const list: VideoFile[] = [];
    const traverse = (files: VideoFile[]) => {
      files.forEach(file => {
        if (!file.is_directory && selectedIds.has(file.id)) {
          list.push(file);
        }
        if (file.children) traverse(file.children);
      });
    };
    traverse(items);
    return list;
  }, [items, selectedIds]);

  const hasSelection = selectedVideos.length > 0;

  return (
    <aside className="w-80 bg-[#0a0a0a] border-r border-white/10 flex flex-col p-6 h-full overflow-y-auto custom-scrollbar">
      {/* BRANDING */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">SubStudio</h1>
          <div className="h-1 w-8 bg-indigo-600 rounded-full mt-1" />
        </div>
        <img src="/logo.png" alt="Logo" className="h-10 w-auto brightness-125" />
      </div>

      <div className="flex-1 space-y-8">
        {/* LIBRARY SECTION */}
        <section className="space-y-3">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Media Library</label>
          <button 
            disabled={isScanning}
            onClick={actions.scan}
            className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 p-3 rounded-xl hover:bg-white/10 transition-all text-sm font-medium disabled:opacity-50"
          >
            {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Folder size={16} className="text-indigo-400" />}
            {isScanning ? "Scanning..." : "Sync Files"}
          </button>
        </section>

        {/* ENGINE CONFIGURATION */}
        <section className={`space-y-6 transition-opacity ${isScanning ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
            <Settings size={12} /> Global Engine
          </div>

          <div className="space-y-2">
            <LanguageDropdown 
              label="SRC" 
              isSingle 
              selected={settings.sourceLang} 
              options={[{id: 'auto', label: 'Auto-Detect'}, ...availableLanguages]}
              onToggle={(id: string) => actions.setSettings({ sourceLang: [id] })}
            />
            <LanguageDropdown 
              label="OUT" 
              selected={settings.targetLanguages} 
              options={availableLanguages}
              onToggle={(id: string) => {
                const updated = settings.targetLanguages.includes(id)
                  ? settings.targetLanguages.filter(x => x !== id)
                  : [...settings.targetLanguages, id];
                actions.setSettings({ targetLanguages: updated });
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2">
              <Cpu size={12} /> Whisper Engine
            </label>
            <select 
              value={settings.modelSize}
              onChange={(e) => actions.setSettings({ modelSize: e.target.value as any })}
              className="w-full bg-black/40 border border-white/10 p-2.5 rounded-lg text-xs font-mono outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="tiny">Tiny (Fastest)</option>
              <option value="base">Base (Recommended)</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large-v3 (Precise)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2">
              <Zap size={12} /> Pipeline Logic
            </label>
            <select 
              value={settings.workflowMode}
              onChange={(e) => actions.setSettings({ workflowMode: e.target.value as any })}
              className="w-full bg-black/40 border border-white/10 p-2.5 rounded-lg text-xs font-mono outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="hybrid">Hybrid: AI + SRT Discovery</option>
              <option value="whisper">Pure: AI Only</option>
              <option value="srt">Legacy: SRT Refining Only</option>
            </select>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/5">
            <Switch 
              label="Auto-Mux into MKV" 
              checked={settings.shouldMux} 
              onChange={(v) => actions.setSettings({ shouldMux: v })} 
            />
            <Switch 
              label="Studio Cleanup (Delete Temp)" 
              checked={settings.shouldRemoveOriginal} 
              danger 
              onChange={(v) => actions.setSettings({ shouldRemoveOriginal: v })} 
            />
          </div>
        </section>
      </div>

      {/* FOOTER ACTION */}
      <div className="pt-6 border-t border-white/10">
        <button 
          disabled={!hasSelection || isScanning}
          onClick={() => actions.process(selectedVideos)}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-10 disabled:grayscale text-white rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl shadow-indigo-500/20"
        >
          {isScanning ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
          PROCESS {selectedVideos.length} {selectedVideos.length === 1 ? 'FILE' : 'FILES'}
        </button>
      </div>
    </aside>
  );
}

function Switch({ label, checked, onChange, danger = false }: any) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className={`text-[11px] ${danger ? 'text-red-400/70 group-hover:text-red-400' : 'text-gray-400 group-hover:text-gray-200'} transition-colors`}>
        {label}
      </span>
      <div className="relative">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)} 
        />
        <div className={`w-7 h-4 rounded-full transition-all peer-checked:after:translate-x-3 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${danger ? 'bg-gray-800 peer-checked:bg-red-600' : 'bg-gray-800 peer-checked:bg-indigo-600'}`} />
      </div>
    </label>
  );
}