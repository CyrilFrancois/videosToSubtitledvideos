"use client";

import React, { useState } from 'react';
import { useStudio } from '@/app/page';
import SubImportModal from './SubImportModal';
import { 
  Volume2, Text, Link as LinkIcon, Clock, Cpu, 
  Check, Play, Loader2, FileText, Globe, ChevronDown, Layers, Lock 
} from 'lucide-react';
import { ProcessingStatus } from '@/lib/types';

export default function VideoCard({ video }: { video: any }) {
  const { state, actions } = useStudio();
  const [showOffsets, setShowOffsets] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- DATA EXTRACTION ---
  const sourceLang = video.sourceLang || ['auto'];
  const targetLanguages = video.targetLanguages || ['fr'];
  const workflowMode = video.workflowMode || 'hybrid';
  
  const syncOffset = typeof video.syncOffset === 'number' ? video.syncOffset : 0;
  const stripExistingSubs = video.stripExistingSubs ?? state.settings.stripExistingSubs;

  // --- UI STATE ---
  const isSelected = state.selectedIds.has(video.id);
  const isProcessing = !['idle', 'done', 'error', 'folder'].includes(video.status);
  
  const subInfo = video.subtitleInfo || { 
    hasSubtitles: false, 
    subType: null, 
    externalPath: null, 
    language: null 
  };
  
  const effectiveWorkflow = !subInfo.hasSubtitles ? 'whisper' : workflowMode;
  const isWhisperActive = effectiveWorkflow === 'whisper';
  const isSourceActive = !isWhisperActive;

  const langList = ["en", "fr", "es", "de", "it", "ja", "ko", "zh"];

  // --- HANDLERS ---
  const handleToggleOutLang = (lang: string) => {
    const next = targetLanguages.includes(lang) 
      ? targetLanguages.filter((l: string) => l !== lang)
      : [...targetLanguages, lang];
    actions.updateVideoData(video.id, { targetLanguages: next });
  };

  const getStatusColor = (status: ProcessingStatus) => {
    switch (status) {
      case 'done': return 'text-emerald-500';
      case 'error': return 'text-red-500';
      case 'idle': return 'text-gray-600';
      default: return 'text-indigo-500';
    }
  };

  return (
    <div className={`group relative mb-3 bg-[#0d0d0d] border rounded-xl transition-all duration-300 ${
      isSelected ? 'border-indigo-500/50 shadow-[0_0_20px_rgba(79,70,229,0.1)]' : 'border-white/5 hover:border-white/10'
    }`}>
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between px-4 py-3">
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

              {/* TOOLTIP */}
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:flex flex-col z-[150] pointer-events-none">
                <div className="bg-[#161616] border border-white/10 p-3 rounded-lg shadow-2xl w-64 backdrop-blur-xl">
                  <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                    <FileText size={12} className="text-indigo-400" />
                    <span className="text-[10px] font-bold text-white uppercase">Subtitle Meta</span>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between"><span className="text-gray-500">Lang:</span><span className="text-indigo-300 font-mono">{subInfo.language || 'AUTO'}</span></div>
                    <div className="text-gray-500">Source:</div>
                    <div className="text-gray-400 font-mono break-all leading-tight text-[9px]">{subInfo.externalPath || 'Embedded'}</div>
                  </div>
                  <div className="absolute top-full left-4 w-2 h-2 bg-[#161616] border-r border-b border-white/10 rotate-45 -translate-y-1" />
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

      {/* CONTROLS SECTION */}
      <div className="px-4 pb-4 grid grid-cols-12 gap-4">
        
        {/* SOURCE LANG - LOCKED TO AUTO */}
        <div className="col-span-2 space-y-1">
          <span className="text-[8px] font-bold text-gray-600 uppercase">Input</span>
          <div className="relative">
            <button 
              disabled 
              className="w-full flex items-center justify-between bg-black/20 border border-white/5 p-2 rounded text-[10px] text-indigo-400/50 font-mono uppercase cursor-not-allowed"
            >
              AUTO
              <Lock size={10} className="text-gray-700" />
            </button>
            {/* The dropdown code remains in the codebase (hidden) for future dev */}
            <div className="hidden absolute top-full left-0 mt-1 grid-cols-2 gap-1 bg-[#161616] border border-white/10 p-2 rounded z-[110] shadow-2xl w-24">
              {["auto", ...langList].map(l => (
                <button key={l} className="text-[10px] p-1 hover:bg-indigo-600 rounded text-gray-300 font-mono uppercase">{l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* OUTPUT LANGS */}
        <div className="col-span-2 space-y-1">
          <span className="text-[8px] font-bold text-gray-600 uppercase">Output</span>
          <div className="relative group/multiselect">
            <button className="w-full flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded text-[10px] text-indigo-400 font-mono uppercase truncate">
              {targetLanguages.join(',')}
              <ChevronDown size={10} />
            </button>
            <div className="absolute top-full left-0 mt-1 hidden group-hover/multiselect:grid grid-cols-3 gap-1 bg-[#161616] border border-white/10 p-2 rounded z-[110] shadow-2xl w-36">
              {langList.map(l => (
                <button 
                  key={l} 
                  onClick={() => handleToggleOutLang(l)} 
                  className={`text-[10px] p-1 rounded font-mono uppercase transition-colors ${targetLanguages.includes(l) ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-gray-500'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* WORKFLOW SWITCH */}
        <div className="col-span-3 space-y-1">
          <span className="text-[8px] font-bold text-gray-600 uppercase">Workflow</span>
          <div className="flex gap-1">
            <button 
              onClick={() => setIsModalOpen(true)}
              className={`flex-1 py-1.5 rounded text-[9px] font-bold uppercase transition-all ${isSourceActive ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-600'}`}
            >
              SRT
            </button>
            <button 
              onClick={() => actions.updateVideoData(video.id, { workflowMode: 'whisper' })}
              className={`flex-1 py-1.5 rounded text-[9px] font-bold uppercase transition-all ${isWhisperActive ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-600'}`}
            >
              Whisper
            </button>
          </div>
        </div>

        {/* STRIP OVERRIDE */}
        <div className="col-span-2 space-y-1">
          <span className="text-[8px] font-bold text-gray-600 uppercase">Internal Subs</span>
          <button 
            onClick={() => actions.updateVideoData(video.id, { stripExistingSubs: !stripExistingSubs })}
            className={`w-full flex items-center justify-center gap-2 py-1.5 rounded text-[9px] font-bold uppercase transition-all border ${
              stripExistingSubs 
              ? 'bg-red-500/10 border-red-500/40 text-red-400' 
              : 'bg-white/5 border-white/5 text-gray-500'
            }`}
          >
            <Layers size={10} />
            {stripExistingSubs ? 'Strip' : 'Keep'}
          </button>
        </div>

        {/* ACTIONS */}
        <div className="col-span-3 flex flex-col justify-end gap-1">
          {/* SYNC OPTION HIDDEN BUT KEPT IN CODE */}
          <button 
            className="hidden text-[9px] font-bold uppercase items-center justify-center gap-1 transition-colors text-gray-500"
          >
            <Clock size={10} /> Sync
          </button>
          
          <button 
            disabled={isProcessing}
            onClick={() => actions.process([video])}
            className={`w-full py-1.5 rounded font-bold text-[10px] uppercase transition-all ${
              isProcessing 
              ? 'bg-white/5 text-gray-600 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-[0.98]'
            }`}
          >
            {isProcessing ? 'Processing' : 'Process'}
          </button>
        </div>
      </div>

      {/* OFFSET CONTROLLER - Logic kept but visual trigger hidden above */}
      {showOffsets && (
        <div className="px-4 py-3 bg-indigo-500/5 border-t border-white/5 flex justify-center">
          <div className="flex items-center gap-3 bg-black border border-white/10 px-4 py-1 rounded-full">
            <button 
              onClick={() => actions.updateVideoData(video.id, { syncOffset: Math.round((syncOffset - 0.1) * 10) / 10 })} 
              className="text-indigo-400 font-bold hover:text-white px-1"
            >
              -
            </button>
            <input 
              type="number" step="0.1"
              value={syncOffset}
              onChange={(e) => actions.updateVideoData(video.id, { syncOffset: parseFloat(e.target.value) || 0 })}
              className="bg-transparent text-center text-xs font-mono text-indigo-400 w-12 outline-none"
            />
            <button 
              onClick={() => actions.updateVideoData(video.id, { syncOffset: Math.round((syncOffset + 0.1) * 10) / 10 })} 
              className="text-indigo-400 font-bold hover:text-white px-1"
            >
              +
            </button>
            <span className="text-[9px] text-gray-600 font-black uppercase">Sec</span>
          </div>
        </div>
      )}

      {/* PROGRESS BAR */}
      {isProcessing && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 rounded-b-xl overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${video.progress}%` }} />
        </div>
      )}

      <SubImportModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        videoName={video.fileName}
        videoPath={video.filePath.substring(0, video.filePath.lastIndexOf('/'))}
        onFileSelect={async (file, targetName, destinationPath) => {
          actions.updateVideoData(video.id, { 
            workflowMode: 'srt',
            subtitleInfo: { 
              hasSubtitles: true, 
              subType: 'manual', 
              externalPath: `${destinationPath}/${targetName}`,
              language: 'unknown'
            }
          });
        }}
      />
    </div>
  );
}