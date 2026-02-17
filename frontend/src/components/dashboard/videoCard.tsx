"use client";

import React, { useState } from 'react';
import { useStudio } from '@/app/page';
import SubImportModal from './SubImportModal';
import { 
  Volume2, Text, Link as LinkIcon, Clock, Cpu, 
  Check, Play, Loader2, FileText, Globe, ChevronDown 
} from 'lucide-react';
import { ProcessingStatus } from '@/lib/types';

export default function VideoCard({ video }: { video: any }) {
  const { state, actions } = useStudio();
  const [showOffsets, setShowOffsets] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- DERIVED UI STATE ---
  const isSelected = state.selectedIds.has(video.id);
  const isProcessing = !['idle', 'done', 'error', 'folder'].includes(video.status);
  
  const subInfo = video.subtitleInfo || { 
    hasSubtitles: false, 
    subType: null, 
    externalPath: null, 
    language: null 
  };
  
  const workflow = video.workflowMode || state.settings.workflowMode;
  const mustUseWhisper = !subInfo.hasSubtitles;
  const activeWorkflow = mustUseWhisper ? 'whisper' : workflow;

  const isWhisperActive = activeWorkflow === 'whisper';
  const isSourceActive = activeWorkflow === 'srt' || activeWorkflow === 'embedded' || (activeWorkflow === 'hybrid' && subInfo.hasSubtitles);

  const langList = ["en", "fr", "es", "de", "it", "ja", "ko", "zh"];

  // --- HELPERS ---
  const safeUpdate = (id: string, data: any) => {
    if (actions && typeof actions.updateVideoData === 'function') {
      actions.updateVideoData(id, data);
    } else {
      console.error("Action 'updateVideoData' is missing from useStudio context.");
    }
  };

  const handleToggleOutLang = (lang: string) => {
    const current = video.targetLanguages || state.settings.targetLanguages;
    const next = current.includes(lang) 
      ? current.filter((l: string) => l !== lang)
      : [...current, lang];
    safeUpdate(video.id, { targetLanguages: next });
  };

  const handleSetSrcLang = (lang: string) => {
    safeUpdate(video.id, { sourceLang: [lang] });
  };

  const getStatusColor = (status: ProcessingStatus) => {
    switch (status) {
      case 'done': return 'text-emerald-500';
      case 'error': return 'text-red-500';
      case 'idle': return 'text-gray-600';
      default: return 'text-indigo-500 animate-pulse';
    }
  };

  return (
    <div className={`group relative mb-3 bg-[#0d0d0d] border rounded-xl transition-all duration-300 ${
      isSelected ? 'border-indigo-500/50 shadow-[0_0_20px_rgba(79,70,229,0.1)]' : 'border-white/5 hover:border-white/10'
    }`}>
      
      {/* STATUS BAR (TOP) */}
      <div className="flex items-center justify-between px-4 py-3 relative">
        <div className="flex items-center gap-3 min-w-0">
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={() => actions.toggleSelection(video.id, false)}
            className="w-4 h-4 rounded border-white/10 bg-white/5 accent-indigo-600 cursor-pointer shrink-0"
          />
          <h3 className="text-sm font-medium text-slate-200 truncate">{video.fileName}</h3>
          
          {subInfo.hasSubtitles && (
            <div className="relative group/tooltip flex shrink-0">
              <span className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded uppercase border border-indigo-500/20 cursor-help">
                <Check size={10} /> {subInfo.subType}
              </span>

              {/* TOOLTIP REINSTATED */}
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:flex flex-col z-[120] pointer-events-none">
                <div className="bg-[#161616] border border-white/10 p-3 rounded-lg shadow-2xl w-80 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="text-indigo-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Subtitle Details</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Globe size={10} className="text-gray-500" />
                      <span className="text-[10px] text-gray-400 uppercase font-bold">Lang:</span>
                      <span className="text-[10px] text-indigo-300 font-mono">{subInfo.language || 'AUTO'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <LinkIcon size={10} className="text-gray-500 mt-0.5" />
                      <div className="min-w-0">
                         <span className="text-[10px] text-gray-400 uppercase font-bold block">Path:</span>
                         <span className="text-[9px] text-gray-500 font-mono break-all leading-tight">{subInfo.externalPath || 'Internal Stream'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-full left-4 w-3 h-3 bg-[#161616] border-r border-b border-white/10 rotate-45 -translate-y-1.5" />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${getStatusColor(video.status)}`}>
          {isProcessing && <Loader2 size={12} className="animate-spin" />}
          {video.statusText || video.status}
        </div>
      </div>

      {/* CONTROLS GRID */}
      <div className="px-4 pb-4 grid grid-cols-12 gap-4">
        
        <div className="col-span-2 space-y-1.5">
          <span className="text-[9px] font-bold text-gray-600 uppercase">Source</span>
          <div className="relative group/select">
            <button className="w-full flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded-lg text-[10px] text-indigo-400 font-mono uppercase hover:border-indigo-500/50">
              <span className="flex items-center gap-1 truncate"><Volume2 size={10} className="text-gray-500"/> {(video.sourceLang || state.settings.sourceLang)[0]}</span>
              <ChevronDown size={10} />
            </button>
            <div className="absolute top-full left-0 mt-1 hidden group-hover/select:grid grid-cols-2 gap-1 bg-[#161616] border border-white/10 p-2 rounded-lg z-[110] shadow-2xl min-w-[100px]">
              {["auto", ...langList].map(l => (
                <button key={l} onClick={() => handleSetSrcLang(l)} className="text-[10px] uppercase p-1 hover:bg-indigo-600 rounded text-gray-300 font-mono text-left">
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-3 space-y-1.5">
          <span className="text-[9px] font-bold text-gray-600 uppercase">Outputs</span>
          <div className="relative group/multiselect">
            <button className="w-full flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded-lg text-[10px] text-indigo-400 font-mono uppercase hover:border-indigo-500/50">
              <span className="flex items-center gap-1 truncate"><Text size={10} className="text-gray-500"/> {(video.targetLanguages || state.settings.targetLanguages).join(',')}</span>
              <ChevronDown size={10} />
            </button>
            <div className="absolute top-full left-0 mt-1 hidden group-hover/multiselect:grid grid-cols-3 gap-1 bg-[#161616] border border-white/10 p-2 rounded-lg z-[110] shadow-2xl min-w-[150px]">
              {langList.map(l => {
                const active = (video.targetLanguages || state.settings.targetLanguages).includes(l);
                return (
                  <button key={l} onClick={() => handleToggleOutLang(l)} className={`text-[10px] uppercase p-1 rounded font-mono transition-colors ${active ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-gray-500'}`}>
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-4 space-y-1.5">
          <span className="text-[9px] font-bold text-gray-600 uppercase">Workflow Overwrite</span>
          <div className="flex gap-1">
            <button 
              onClick={() => setIsModalOpen(true)}
              className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-[9px] font-bold uppercase transition-all ${
                isSourceActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:bg-white/10'
              }`}
            >
              <LinkIcon size={12} /> Local SRT
            </button>
            <button 
              onClick={() => safeUpdate(video.id, { workflowMode: 'whisper' })}
              className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-[9px] font-bold uppercase transition-all ${
                isWhisperActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:bg-white/10'
              }`}
            >
              <Cpu size={12} /> Whisper
            </button>
          </div>
        </div>

        <div className="col-span-3 flex flex-col justify-end gap-1.5">
          <button 
            onClick={() => setShowOffsets(!showOffsets)}
            className={`text-[9px] font-bold uppercase flex items-center justify-center gap-2 transition-colors ${showOffsets ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <Clock size={11} /> {video.syncOffset ? `${video.syncOffset}s Offset` : 'Sync'}
          </button>
          <button 
            disabled={isProcessing}
            onClick={() => actions.process([video])}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Play size={10} fill="currentColor" /> Process
          </button>
        </div>
      </div>

      {/* OFFSET DRAWER - CENTERED PILL */}
      {showOffsets && (
        <div className="px-4 py-3 bg-indigo-500/5 border-t border-white/5 flex justify-center items-center">
          <div className="flex items-center gap-4 bg-black border border-white/10 px-4 py-1.5 rounded-full shadow-inner">
            <span className="text-[9px] font-black text-gray-500 uppercase">Offset</span>
            <div className="flex items-center gap-3">
               <button onClick={() => safeUpdate(video.id, { syncOffset: (video.syncOffset || 0) - 0.1 })} className="text-indigo-400 hover:text-white font-bold text-lg">-</button>
               <input 
                type="number" step="0.1"
                value={video.syncOffset || 0}
                onChange={(e) => safeUpdate(video.id, { syncOffset: parseFloat(e.target.value) || 0 })}
                className="bg-transparent text-center text-xs font-mono text-indigo-400 w-12 outline-none"
              />
              <button onClick={() => safeUpdate(video.id, { syncOffset: (video.syncOffset || 0) + 0.1 })} className="text-indigo-400 hover:text-white font-bold text-lg">+</button>
            </div>
            <span className="text-[9px] text-gray-500 font-bold uppercase">Sec</span>
          </div>
        </div>
      )}

      {/* PROGRESS BAR */}
      {isProcessing && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden rounded-b-xl">
          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${video.progress}%` }} />
        </div>
      )}

      <SubImportModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        videoName={video.fileName}
        onSelect={(path) => {
          safeUpdate(video.id, { 
            workflowMode: 'srt',
            subtitleInfo: { ...subInfo, hasSubtitles: true, subType: 'manual', externalPath: path }
          });
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}