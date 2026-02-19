"use client";

import React, { useMemo } from 'react';
import { useStudio } from '@/app/page';
import { 
  Folder, Play, Volume2, Text, Eraser,
  Check, Loader2, ChevronDown, Cpu, Zap, Settings, Lock
} from 'lucide-react';
import { VideoFile } from '@/lib/types';

function LanguageDropdown({ label, selected, options, isSingle = false, onToggle, disabled = false }: any) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const displayValue = isSingle 
    ? (selected[0] === 'auto' ? 'Auto Detect' : options.find((o: any) => o.id === selected[0])?.label || 'Select')
    : selected.map((id: string) => id.toUpperCase()).join(', ') || 'None';

  return (
    <div className={`relative ${disabled ? 'opacity-60' : ''}`}>
      <button 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-[11px] transition-all ${disabled ? 'cursor-not-allowed' : 'hover:border-indigo-500/50'}`}
      >
        <div className="flex items-center gap-2">
          {label === "SRC" ? <Volume2 size={12} className="text-gray-500" /> : <Text size={12} className="text-gray-500" />}
          <span className="text-gray-500 font-bold">{label}:</span> 
          <span className="text-indigo-400 font-bold truncate">{displayValue}</span>
        </div>
        {disabled ? <Lock size={10} className="text-gray-700" /> : <ChevronDown size={12} className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {isOpen && !disabled && (
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

  // REWRITE: Improved recursive check to ensure UI unlocks when all files are 'done'
  const isAnyFileProcessing = useMemo(() => {
    const checkRecursive = (files: VideoFile[]): boolean => {
      return files.some(f => 
        f.status === 'processing' || 
        f.status === 'queued' || 
        (f.children && checkRecursive(f.children))
      );
    };
    return checkRecursive(items || []);
  }, [items]);

  const availableLanguages = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_LANGUAGES || '{"English":"en", "French":"fr", "Spanish":"es", "German":"de", "Japanese":"ja"}';
    return Object.entries(JSON.parse(raw)).map(([label, id]) => ({ id, label }));
  }, []);

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
    traverse(items || []);
    return list;
  }, [items, selectedIds]);

  const hasSelection = selectedVideos.length > 0;

  return (
    <aside className="w-80 bg-[#0a0a0a] border-r border-white/10 flex flex-col p-6 h-full overflow-y-auto custom-scrollbar shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
      <div className="mb-10 flex items-center justify-start gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tighter uppercase italic leading-none">
            SubStudio
          </h1>
          <div className="h-1 w-8 bg-indigo-600 rounded-full mt-1.5 ml-auto" />
        </div>
        <img 
          src="/logo.png" 
          alt="Logo" 
          className="w-10 h-10 object-contain"
        />
      </div>

      <div className="flex-1 space-y-8">
        <section className="space-y-3">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Media Library</label>
          <button 
            disabled={isScanning || isAnyFileProcessing}
            onClick={actions.scan}
            className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 p-3 rounded-xl hover:bg-white/10 transition-all text-sm font-medium disabled:opacity-20 disabled:cursor-not-allowed"
          >
            {isScanning ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Folder size={16} className="text-indigo-400" />}
            {isScanning ? "Scanning..." : "Sync Files"}
          </button>
        </section>

        <section className={`space-y-6 transition-all duration-500 ${isScanning || isAnyFileProcessing ? 'opacity-50 grayscale-[0.5]' : 'opacity-100'}`}>
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
            <Settings size={12} /> Global Engine
          </div>

          <div className="space-y-2">
            <LanguageDropdown 
              label="SRC" 
              isSingle 
              disabled={true}
              selected={['auto']} 
              options={[{id: 'auto', label: 'Auto-Detect'}]}
              onToggle={() => {}} 
            />
            <LanguageDropdown 
              label="OUT" 
              disabled={isAnyFileProcessing}
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
              disabled={isAnyFileProcessing}
              value={settings.modelSize}
              onChange={(e) => actions.setSettings({ modelSize: e.target.value as any })}
              className="w-full bg-black/40 border border-white/10 p-2.5 rounded-lg text-xs font-mono outline-none focus:border-indigo-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="tiny">Tiny (Fastest)</option>
              <option value="base">Base (~1 GB)</option>
              <option value="small">Small (~2 GB)</option>
              <option value="medium">Medium (~5 GB)</option>
              <option value="large">Large-v3 (⚠ ~10 GB)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2">
              <Zap size={12} /> Pipeline Logic
            </label>
            <select 
              disabled={isAnyFileProcessing}
              value={settings.workflowMode || 'hybrid'} 
              onChange={(e) => actions.setSettings({ workflowMode: e.target.value as any })}
              className="w-full bg-black/40 border border-white/10 p-2.5 rounded-lg text-xs font-mono outline-none focus:border-indigo-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="hybrid">Hybrid: SRT if found else AI</option>
              <option value="whisper">Pure: AI Only</option>
              <option value="srt">Legacy: SRT Refining Only</option>
            </select>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/5">
            <Switch 
              label={settings.shouldMux ? "Mux into MKV" : "SRT Files Only"} 
              checked={settings.shouldMux} 
              disabled={isAnyFileProcessing}
              onChange={(v: boolean) => actions.setSettings({ shouldMux: v })} 
            />
            <Switch 
              label="Strip existing subs" 
              icon={<Eraser size={12} />}
              checked={settings.stripExistingSubs} 
              disabled={isAnyFileProcessing}
              danger={true} 
              onChange={(v: boolean) => actions.setSettings({ stripExistingSubs: v })} 
            />
          </div>
        </section>
      </div>

      <div className="pt-6 border-t border-white/10 bg-[#0a0a0a]">
        <button 
          disabled={!hasSelection || isScanning || isAnyFileProcessing}
          onClick={() => actions.process(selectedVideos)}
          className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl 
            ${(!hasSelection || isScanning || isAnyFileProcessing) 
              ? 'bg-white/5 text-gray-600 grayscale opacity-40 cursor-not-allowed shadow-none border border-white/5' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/40'}`}
        >
          {isAnyFileProcessing ? (
            <>
              <Loader2 size={18} className="animate-spin text-indigo-400" />
              <span>PIPELINE BUSY</span>
            </>
          ) : (
            <>
              <Play size={18} fill="currentColor" />
              <span>PROCESS {selectedVideos.length} {selectedVideos.length === 1 ? 'FILE' : 'FILES'}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function Switch({ label, icon, checked, onChange, danger = false, disabled = false }: any) {
  return (
    <label className={`flex items-center justify-between group ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <div className="flex items-center gap-2">
        {icon && <span className={checked ? (danger ? 'text-red-500' : 'text-indigo-400') : 'text-gray-600'}>{icon}</span>}
        <span className={`text-[11px] font-medium transition-colors ${
          danger 
            ? (checked ? 'text-red-500' : 'text-red-400/60 group-hover:text-red-400') 
            : 'text-gray-400 group-hover:text-gray-200'
        }`}>
          {label}
        </span>
      </div>
      <div className="relative">
        <input 
          type="checkbox" 
          disabled={disabled}
          className="sr-only peer" 
          checked={checked} 
          onChange={(e) => !disabled && onChange(e.target.checked)} 
        />
        <div className={`w-7 h-4 rounded-full transition-all peer-checked:after:translate-x-3 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${danger ? 'bg-gray-800 peer-checked:bg-red-600' : 'bg-gray-800 peer-checked:bg-indigo-600'}`} />
      </div>
    </label>
  );
}