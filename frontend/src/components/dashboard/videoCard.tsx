"use client";

import SubImportModal from './SubImportModal';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Volume2, Text, Link as LinkIcon, Clock, Upload, Cpu, ChevronDown, Check
} from 'lucide-react';
import { uploadSubtitle } from '@/lib/api'; 
import { VideoFile } from '@/lib/types';

// --- PORTAL DROPDOWN ---
function PortalDropdown({ isOpen, anchorRef, children }: { isOpen: boolean, anchorRef: React.RefObject<HTMLElement>, children: React.ReactNode }) {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  
  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({ 
        top: rect.bottom + window.scrollY, 
        left: rect.left + window.scrollX, 
        width: rect.width 
      });
    }
  }, [isOpen, anchorRef]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed z-[9999] bg-[#1a1a1a] border border-white/10 rounded shadow-2xl py-1 max-h-48 overflow-y-auto custom-scrollbar" 
      style={{ top: coords.top + 4, left: coords.left, width: Math.max(coords.width, 160) }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

// --- LANGUAGE SELECTOR ---
function LanguageSelector({ label, selected, options, onToggle, isSingle = false, showAuto = false }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const displayValue = isSingle 
    ? (selected === 'auto' ? 'Auto' : options.find((o: any) => o.id === selected)?.label || 'Select')
    : (Array.isArray(selected) && selected.length > 0 ? selected.map((id: string) => id.toUpperCase()).join(', ') : 'None');

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }} 
        className={`flex items-center justify-between w-full px-2 py-1.5 bg-black border border-white/10 rounded text-[10px] font-mono hover:border-indigo-500/50 transition-colors ${isSingle ? 'text-blue-400' : 'text-indigo-400'}`}
      >
        <div className="flex items-center">
          {label === "SRC" ? <Volume2 size={10} className="mr-2 text-gray-600" /> : <Text size={10} className="mr-2 text-gray-600" />}
          <span className="text-gray-600 mr-2">{label}:</span> 
        </div>
        <span className="truncate flex-1 text-right mr-1 font-bold">{displayValue}</span>
        <ChevronDown size={10} className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <PortalDropdown isOpen={isOpen} anchorRef={containerRef}>
        {showAuto && (
          <div onClick={() => { onToggle('auto'); setIsOpen(false); }} className="flex items-center justify-between px-3 py-2 hover:bg-indigo-500/10 cursor-pointer text-[10px] border-b border-white/5">
            <span className={selected === 'auto' ? 'text-blue-400' : 'text-gray-400'}>Auto Detect</span>
            {selected === 'auto' && <Check size={12} className="text-blue-400" />}
          </div>
        )}
        {options.map((lang: any) => (
          <div key={lang.id} onClick={() => { onToggle(lang.id); if (isSingle) setIsOpen(false); }} className="flex items-center justify-between px-3 py-2 hover:bg-white/5 cursor-pointer text-[10px]">
            <span className={(isSingle ? selected === lang.id : selected.includes(lang.id)) ? (isSingle ? 'text-blue-400' : 'text-indigo-400') : 'text-gray-400'}>
              {lang.label} ({lang.id.toUpperCase()})
            </span>
            {(isSingle ? selected === lang.id : selected.includes(lang.id)) && <Check size={12} className={isSingle ? 'text-blue-400' : 'text-indigo-400'} />}
          </div>
        ))}
      </PortalDropdown>
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function VideoCard({ video, onStart, onCancel, updateVideoData, globalSettings }: any) {
  // Use a fallback to ensure we never crash on null subInfo
  const subInfo = video.subtitleInfo || { hasSubtitles: false, subType: null, srtPath: "None" };
  const [showOffsets, setShowOffsets] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Determine active workflow
  const workflow = video.workflowMode || globalSettings?.workflowMode || 'hybrid';
  
  const isExternalActive = workflow === 'external';
  const isWhisperActive = 
    workflow === 'whisper' || 
    workflow === 'force_ai' || 
    (workflow === 'hybrid' && !subInfo.hasSubtitles);

  const isEmbeddedActive = 
    !isWhisperActive && !isExternalActive && 
    (workflow === 'embedded' || (workflow === 'hybrid' && subInfo.subType === 'embedded'));

  const isSrtActive = 
    !isWhisperActive && !isExternalActive && 
    (workflow === 'srt' || (workflow === 'hybrid' && subInfo.hasSubtitles && subInfo.subType !== 'embedded'));

  // 2. Logic for the Hover Note - FIXED: Looking specifically at srtPath from the new Scanner
  const getSubPathNote = () => {
    const actualPath = subInfo.srtPath;
    
    if (subInfo.subType === 'embedded') {
        return "Internal tracks detected (MKV/MP4)";
    }

    if (subInfo.hasSubtitles && actualPath && actualPath !== "None" && actualPath !== "Embedded") {
      // Split by / or \ and get the last part (the filename)
      const fileName = actualPath.split(/[/\\]/).pop(); 
      return `External File: ${fileName}`;
    }
    
    return undefined; 
  };

  const handleUpdate = (updates: Partial<VideoFile>) => {
    updateVideoData(video.id, updates);
  };

  const rawLangData = process.env.NEXT_PUBLIC_LANGUAGES || '{"English":"en", "French":"fr", "Spanish":"es"}';
  const availableLanguages = useMemo(() => 
    Object.entries(JSON.parse(rawLangData)).map(([label, id]) => ({ id, label })), 
  [rawLangData]);

  const statusAccent = video.status === 'processing' 
    ? 'border-l-indigo-500' 
    : video.status === 'done' 
      ? 'border-l-emerald-500' 
      : 'border-l-transparent';

  return (
    <div className={`my-2 bg-[#0d0d0d] border border-white/5 rounded-lg transition-all ${statusAccent} border-l-4 relative`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100 truncate">{video.fileName}</h3>
            
            {/* BADGE: Subtitle detection logic */}
            {subInfo.hasSubtitles && (
              <div 
                title={getSubPathNote()}
                className={`flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 rounded transition-all cursor-help hover:bg-indigo-500/20`}
              >
                <Check size={8} className="text-indigo-400" />
                <span className="text-[8px] font-bold text-indigo-400 uppercase">
                  {subInfo.subType === 'embedded' ? 'Embedded' : 'SRT Detected'}
                </span>
              </div>
            )}
          </div>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest ${video.status === 'processing' ? 'text-indigo-500 animate-pulse' : 'text-gray-700'}`}>
          {video.status || 'Idle'}
        </span>
      </div>

      {/* Settings Grid */}
      <div className="px-4 py-3 border-t border-white/5 grid grid-cols-12 gap-4 items-end">
        {/* Langs */}
        <div className="col-span-3 space-y-2">
          <label className="text-[9px] text-gray-600 uppercase font-bold">Languages</label>
          <div className="space-y-1 bg-black/40 p-1.5 rounded border border-white/5 min-h-[85px] flex flex-col justify-center">
            <LanguageSelector 
              label="SRC" 
              selected={video.sourceLang || 'auto'} 
              options={availableLanguages} 
              onToggle={(id: string) => handleUpdate({ sourceLang: id })} 
              isSingle showAuto 
            />
            <LanguageSelector 
              label="OUT" 
              selected={video.targetLanguages || []} 
              options={availableLanguages} 
              onToggle={(id: string) => {
                const current = video.targetLanguages || [];
                const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
                handleUpdate({ targetLanguages: next });
              }} 
            />
          </div>
        </div>

        {/* Workflow */}
        <div className="col-span-5 space-y-2">
          <label className="text-[9px] text-gray-600 uppercase font-bold">Workflow</label>
          <div className="flex flex-col gap-1 bg-black/40 p-1.5 rounded border border-white/5 min-h-[85px] justify-center">
            <button 
              disabled={!subInfo.hasSubtitles}
              onClick={() => handleUpdate({ workflowMode: subInfo.subType === 'embedded' ? 'embedded' : 'srt' })}
              className={`flex items-center gap-2 px-2 py-1 text-[9px] font-bold rounded uppercase transition-colors ${
                (isSrtActive || isEmbeddedActive) ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-300 disabled:opacity-30'
              }`}
            >
              <LinkIcon size={10} /> {subInfo.subType === 'embedded' ? 'Use Embedded' : 'Use Matching SRT'}
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center gap-2 px-2 py-1 text-[9px] font-bold rounded uppercase transition-colors ${
                isExternalActive ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Upload size={10} /> Import External
            </button>
            <button 
              onClick={() => handleUpdate({ workflowMode: 'whisper' })}
              className={`flex items-center gap-2 px-2 py-1 text-[9px] font-bold rounded uppercase transition-colors ${
                isWhisperActive ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Cpu size={10} /> Generate with Whisper
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-4 space-y-2">
          <label className="text-[9px] text-gray-600 uppercase font-bold">Actions</label>
          <div className="flex flex-col gap-1 bg-black/40 p-1.5 rounded border border-white/5 min-h-[85px] justify-center">
            <button 
              onClick={() => setShowOffsets(!showOffsets)} 
              className={`flex items-center justify-center gap-2 py-1 rounded text-[9px] font-bold uppercase transition-colors ${showOffsets ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-400'}`}
            >
              <Clock size={11} /> Sync Offset
            </button>
            <button 
              onClick={() => onStart(video)} 
              className="w-full py-1.5 bg-indigo-600 text-white rounded font-bold text-[9px] uppercase hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/10 active:scale-[0.98]"
            >
              Execute Job
            </button>
          </div>
        </div>
      </div>

      {showOffsets && (
        <div className="px-4 py-3 bg-indigo-500/5 border-t border-white/5 flex items-center gap-3 animate-in slide-in-from-top-1 duration-200">
          <span className="text-[8px] text-gray-600 font-bold uppercase">Offset (s):</span>
          <input 
            type="number" step="0.1"
            value={video.syncOffset || 0}
            onChange={(e) => handleUpdate({ syncOffset: parseFloat(e.target.value) || 0 })}
            className="bg-black border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-indigo-400 w-16 outline-none focus:border-indigo-500/50" 
          />
        </div>
      )}

      <SubImportModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        videoName={video.fileName} 
        videoPath={video.filePath.substring(0, video.filePath.lastIndexOf('/'))}
        onFileSelect={async (file, target, dest) => {
          try {
            await uploadSubtitle(file, target, dest);
            handleUpdate({ workflowMode: 'external' });
            setIsModalOpen(false);
          } catch (err) {
            console.error("Upload failed", err);
          }
        }} 
      />
    </div>
  );
}