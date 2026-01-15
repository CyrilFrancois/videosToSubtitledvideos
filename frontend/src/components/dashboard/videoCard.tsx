"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Folder, Volume2, Text, Link as LinkIcon, ChevronRight, 
  Clock, Upload, Cpu, ChevronDown, Check, Info
} from 'lucide-react';

// --- SUB-COMPONENT: PortalDropdown ---
function PortalDropdown({ isOpen, anchorRef, children }) {
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

// --- SUB-COMPONENT: LanguageSelector ---
function LanguageSelector({ label, selected, options, onToggle, isSingle = false, showAuto = false }) {
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
    ? (selected[0] === 'auto' ? 'Auto' : options.find(o => o.id === selected[0])?.label || 'Select')
    : selected.map(id => id.toUpperCase()).join(', ') || 'None';

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
      </PortalDropdown>
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function VideoCard({ video, onStart, onCancel, onNavigate, globalSettings }) {
  const isDir = video.is_directory;
  const subInfo = video.subtitleInfo || { hasSubtitles: false, languages: [], count: 0, subType: null };
  const [showOffsets, setShowOffsets] = useState(false);
  
  // 1. SMART INITIALIZATION: Check if scanner found specific languages
  const [srcLang, setSrcLang] = useState(
    subInfo.hasSubtitles && subInfo.languages[0] !== 'auto' 
      ? [subInfo.languages[0]] 
      : (globalSettings?.sourceLang || ['auto'])
  );
  const [outLangs, setOutLangs] = useState(globalSettings?.targetLanguages || ['fr']);
  
  // 2. WORKFLOW DECISION LOGIC
  const determineBestWorkflow = () => {
    if (globalSettings?.workflowMode === 'force_ai') return 'whisper';
    if (subInfo.subType === 'embedded') return 'embedded';
    if (subInfo.hasSubtitles) return 'srt';
    return 'whisper';
  };

  const [workflow, setWorkflow] = useState(determineBestWorkflow());

  // Effect to sync with Sidebar and Backend detection results
  useEffect(() => {
    if (globalSettings) {
      setOutLangs(globalSettings.targetLanguages || ['fr']);
      
      if (globalSettings.workflowMode === 'force_ai') {
        setWorkflow('whisper');
      } else {
        setWorkflow(determineBestWorkflow());
      }

      // Update source lang if global settings change, unless we already have a detection hit
      if (!subInfo.hasSubtitles || subInfo.languages[0] === 'auto') {
        setSrcLang(globalSettings.sourceLang || ['auto']);
      }
    }
  }, [globalSettings, subInfo.hasSubtitles, subInfo.subType]);

  const rawLangData = process.env.NEXT_PUBLIC_LANGUAGES || '{"English":"en", "French":"fr", "Spanish":"es", "German":"de"}';
  const availableLanguages = Object.entries(JSON.parse(rawLangData)).map(([label, id]) => ({ id, label }));

  if (isDir) {
    return (
      <div 
        onClick={() => onNavigate(video.filePath)}
        className="group flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 my-1"
      >
        <Folder size={18} className="text-indigo-400/60 group-hover:text-indigo-400" fill="currentColor" />
        <span className="text-sm text-gray-400 group-hover:text-white transition-colors truncate">{video.fileName}</span>
        <ChevronRight size={14} className="ml-auto text-gray-700 group-hover:text-gray-400" />
      </div>
    );
  }

  const statusAccent = video.status === 'processing' ? 'border-l-indigo-500' : 
                      video.status === 'done' ? 'border-l-emerald-500' : 'border-l-transparent';

  return (
    <div className={`my-2 bg-[#0d0d0d] border border-white/5 rounded-lg transition-all ${statusAccent} border-l-4 relative`}>
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100 truncate">{video.fileName}</h3>
            <span className="text-[9px] text-gray-600 font-mono uppercase px-1.5 py-0.5 bg-white/5 rounded">{video.extension}</span>
            
            {/* SMART BADGE: SUBTITLES DETECTED */}
            {subInfo.hasSubtitles && (
              <div className="group/tooltip relative flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 rounded animate-in fade-in zoom-in duration-300 cursor-help">
                <Check size={8} className="text-indigo-400" />
                <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-tighter">
                  {subInfo.subType === 'embedded' ? 'Embedded Subs' : 'SRT Found'}
                </span>

                {/* TOOLTIP ON HOVER */}
                {subInfo.foundFiles && subInfo.foundFiles.length > 0 && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:block z-50">
                    <div className="bg-[#1a1a1a] border border-indigo-500/50 text-[9px] text-indigo-200 px-2 py-1 rounded shadow-xl whitespace-nowrap">
                      <p className="border-b border-white/10 mb-1 pb-1 text-gray-500 font-bold uppercase">Linked Files:</p>
                      {subInfo.foundFiles.map((fname, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                          {fname}
                        </div>
                      ))}
                      {/* Tooltip Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#1a1a1a]" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-[9px] font-black uppercase tracking-widest ${video.status === 'processing' ? 'text-indigo-500 animate-pulse' : 'text-gray-700'}`}>
            {video.status || 'Idle'}
          </span>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-white/5 grid grid-cols-12 gap-4 items-end">
        <div className="col-span-3 space-y-2 self-stretch flex flex-col justify-between">
          <label className="text-[9px] text-gray-600 uppercase font-bold tracking-tight">Language Setup</label>
          <div className="space-y-1 bg-black/40 p-1.5 rounded border border-white/5 min-h-[85px] flex flex-col justify-center">
            <LanguageSelector label="SRC" selected={srcLang} options={availableLanguages} onToggle={(id) => setSrcLang([id])} isSingle showAuto />
            <LanguageSelector label="OUT" selected={outLangs} options={availableLanguages} onToggle={(id) => setOutLangs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} />
          </div>
        </div>

        <div className="col-span-5 space-y-2 self-stretch flex flex-col justify-between">
          <label className="text-[9px] text-gray-600 uppercase font-bold tracking-tight">Workflow Mode</label>
          <div className="flex flex-col gap-1 bg-black/40 p-1.5 rounded border border-white/5 min-h-[85px] justify-center">
            <button 
              disabled={!subInfo.hasSubtitles}
              onClick={() => setWorkflow(subInfo.subType === 'embedded' ? 'embedded' : 'srt')}
              className={`flex items-center gap-2 px-2 py-1 text-[9px] font-bold rounded uppercase transition-colors ${
                (workflow === 'srt' || workflow === 'embedded') ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-300 disabled:opacity-10 disabled:grayscale'
              }`}
            >
              <LinkIcon size={10} /> 
              {subInfo.subType === 'embedded' ? 'Use Embedded' : subInfo.hasSubtitles ? 'Use Matching SRT' : 'No Subtitles'}
            </button>
            <button 
              onClick={() => setWorkflow('external')}
              className={`flex items-center gap-2 px-2 py-1 text-[9px] font-bold rounded uppercase transition-colors ${
                workflow === 'external' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Upload size={10} /> Import External SRT
            </button>
            <button 
              onClick={() => setWorkflow('whisper')}
              className={`flex items-center gap-2 px-2 py-1 text-[9px] font-bold rounded uppercase transition-colors ${
                workflow === 'whisper' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Cpu size={10} /> AI Whisper Engine
            </button>
          </div>
        </div>

        <div className="col-span-4 space-y-2 self-stretch flex flex-col justify-between">
          <label className="text-[9px] text-gray-600 uppercase font-bold tracking-tight">Actions</label>
          <div className="flex flex-col gap-1 bg-black/40 p-1.5 rounded border border-white/5 min-h-[85px] justify-center">
            <button 
              onClick={() => setShowOffsets(!showOffsets)}
              className={`flex items-center justify-center gap-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                showOffsets ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-400' : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              <Clock size={11} /> {showOffsets ? 'Hide Sync' : 'Add Sync Offset'}
            </button>

            {video.status === 'processing' ? (
              <button onClick={() => onCancel(video.id)} className="w-full py-1.5 bg-red-500/20 text-red-500 rounded font-bold text-[9px] uppercase hover:bg-red-500 hover:text-white transition-colors border border-red-500/30">
                Terminate Process
              </button>
            ) : (
              <button onClick={() => onStart(video.id)} className="w-full py-1.5 bg-indigo-600 text-white rounded font-bold text-[9px] uppercase shadow-lg hover:bg-indigo-500 active:scale-95 transition-all">
                Execute Job
              </button>
            )}
          </div>
        </div>
      </div>

      {showOffsets && (
        <div className="px-4 py-3 bg-indigo-500/5 border-t border-white/5 flex items-center gap-3 animate-in slide-in-from-top-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-gray-600 font-bold uppercase">Time:</span>
              <input type="text" placeholder="00:00:00" className="bg-black border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-indigo-400 w-20 outline-none focus:border-indigo-500" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-gray-600 font-bold uppercase">Offset:</span>
              <input type="number" placeholder="+0.0s" className="bg-black border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-indigo-400 w-16 outline-none focus:border-indigo-500" />
            </div>
            <p className="text-[8px] text-gray-500 italic ml-auto text-right">Timing corrections apply to final export</p>
        </div>
      )}
    </div>
  );
}