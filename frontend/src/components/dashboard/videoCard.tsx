"use client";

import React, { useState } from 'react';
import { useStudio } from '@/app/page';
import SubImportModal from './SubImportModal';
import { 
  Check, Loader2, FileText, ChevronDown, Layers, Lock 
} from 'lucide-react';
import { ProcessingStatus } from '@/lib/types';

export default function VideoCard({ video }: { video: any }) {
  const { state, actions } = useStudio();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- DATA EXTRACTION ---
  const targetLanguages = video.targetLanguages || ['fr'];
  const workflowMode = video.workflowMode || 'hybrid';
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
      <div className="px-4 pb-4 grid grid-cols-12 gap-4 items-end">
        
        {/* SOURCE LANG - LOCKED */}
        <div className="col-span-2 space-y-1.5">
          <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter">Input</span>
          <button 
            disabled 
            className="w-full flex items-center justify-between bg-white/[0.02] border border-white/5 p-2 rounded text-[10px] text-gray-600 font-mono uppercase cursor-not-allowed h-8"
          >
            AUTO
            <Lock size={10} />
          </button>
        </div>

        {/* OUTPUT LANGS */}
        <div className="col-span-2 space-y-1.5">
          <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter">Output</span>
          <div className="relative group/multiselect">
            <button className="w-full flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded text-[10px] text-indigo-400 font-mono uppercase truncate h-8">
              {targetLanguages.join(',')}
              <ChevronDown size={10} />
            </button>
            <div className="absolute bottom-full left-0 mb-1 hidden group-hover/multiselect:grid grid-cols-3 gap-1 bg-[#161616] border border-white/10 p-2 rounded z-[110] shadow-2xl w-36">
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
        <div className="col-span-3 space-y-1.5">
          <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter">Workflow</span>
          <div className="flex gap-1 h-8">
            <button 
              onClick={() => setIsModalOpen(true)}
              className={`flex-1 rounded text-[9px] font-bold uppercase transition-all ${isSourceActive ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-600 hover:text-gray-400'}`}
            >
              SRT
            </button>
            <button 
              onClick={() => actions.updateVideoData(video.id, { workflowMode: 'whisper' })}
              className={`flex-1 rounded text-[9px] font-bold uppercase transition-all ${isWhisperActive ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-600 hover:text-gray-400'}`}
            >
              Whisper
            </button>
          </div>
        </div>

        {/* STRIP OVERRIDE */}
        <div className="col-span-2 space-y-1.5">
          <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter">Internal Subs</span>
          <button 
            onClick={() => actions.updateVideoData(video.id, { stripExistingSubs: !stripExistingSubs })}
            className={`w-full flex items-center justify-center gap-2 rounded text-[9px] font-bold uppercase transition-all border h-8 ${
              stripExistingSubs 
              ? 'bg-red-500/10 border-red-500/30 text-red-400' 
              : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-400'
            }`}
          >
            <Layers size={10} />
            {stripExistingSubs ? 'Strip' : 'Keep'}
          </button>
        </div>

        {/* PROCESS ACTION */}
        <div className="col-span-3">
          <button 
            disabled={isProcessing}
            onClick={() => actions.process([video])}
            className={`w-full h-8 rounded font-black text-[10px] uppercase transition-all ${
              isProcessing 
              ? 'bg-indigo-500/10 text-indigo-400/50 cursor-not-allowed border border-indigo-500/20' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/10 active:scale-[0.97]'
            }`}
          >
            {isProcessing ? 'Processing...' : 'Start Process'}
          </button>
        </div>
      </div>

      {/* PROGRESS BAR */}
      {isProcessing && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 rounded-b-xl overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all duration-1000 ease-out" style={{ width: `${video.progress}%` }} />
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