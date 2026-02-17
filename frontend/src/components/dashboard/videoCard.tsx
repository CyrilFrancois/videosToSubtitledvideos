"use client";

import React, { useState, useMemo } from 'react';
import { useStudio } from '@/app/page';
import SubImportModal from './SubImportModal';
import { 
  Volume2, Text, Link as LinkIcon, Clock, Upload, Cpu, 
  ChevronDown, Check, Play, AlertCircle, Loader2 
} from 'lucide-react';
import { uploadSubtitle } from '@/lib/api';
import { ProcessingStatus } from '@/lib/types';

export default function VideoCard({ video }: { video: any }) {
  const { state, actions } = useStudio();
  const [showOffsets, setShowOffsets] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- DERIVED UI STATE ---
  const isSelected = state.selectedIds.has(video.id);
  const isProcessing = !['idle', 'done', 'error', 'folder'].includes(video.status);
  
  const subInfo = video.subtitleInfo || { hasSubtitles: false, subType: null };
  const workflow = video.workflowMode || state.settings.workflowMode;

  // Logic to determine which button is visually "active"
  const isWhisperActive = workflow === 'whisper' || (workflow === 'hybrid' && !subInfo.hasSubtitles);
  const isSourceActive = workflow === 'srt' || workflow === 'embedded' || (workflow === 'hybrid' && subInfo.hasSubtitles);

  // --- HELPERS ---
  const getStatusColor = (status: ProcessingStatus) => {
    switch (status) {
      case 'done': return 'text-emerald-500';
      case 'error': return 'text-red-500';
      case 'idle': return 'text-gray-600';
      default: return 'text-indigo-500 animate-pulse';
    }
  };

  const availableLanguages = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_LANGUAGES || '{"English":"en", "French":"fr"}';
    return Object.entries(JSON.parse(raw)).map(([label, id]) => ({ id, label }));
  }, []);

  return (
    <div className={`group relative mb-3 bg-[#0d0d0d] border rounded-xl transition-all duration-300 ${
      isSelected ? 'border-indigo-500/50 shadow-[0_0_20px_rgba(79,70,229,0.1)]' : 'border-white/5 hover:border-white/10'
    }`}>
      
      {/* STATUS BAR (TOP) */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={() => actions.toggleSelection(video.id, false)}
            className="w-4 h-4 rounded border-white/10 bg-white/5 accent-indigo-600 cursor-pointer"
          />
          <h3 className="text-sm font-medium text-slate-200 truncate">{video.fileName}</h3>
          {subInfo.hasSubtitles && (
            <span className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded uppercase border border-indigo-500/20">
              <Check size={10} /> {subInfo.subType}
            </span>
          )}
        </div>
        
        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${getStatusColor(video.status)}`}>
          {isProcessing && <Loader2 size={12} className="animate-spin" />}
          {video.statusText || video.status}
        </div>
      </div>

      {/* CONTROLS GRID */}
      <div className="px-4 pb-4 grid grid-cols-12 gap-4">
        
        {/* Language Selection */}
        <div className="col-span-3 space-y-2">
          <span className="text-[9px] font-bold text-gray-600 uppercase">Languages</span>
          <div className="space-y-1.5 p-2 rounded-lg bg-black/40 border border-white/5">
            <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
              <span className="flex items-center gap-1"><Volume2 size={10}/> SRC</span>
              <span className="text-indigo-400 font-mono">{(video.sourceLang || state.settings.sourceLang)[0]}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
              <span className="flex items-center gap-1"><Text size={10}/> OUT</span>
              <span className="text-indigo-400 font-mono">{(video.targetLanguages || state.settings.targetLanguages).join(',')}</span>
            </div>
          </div>
        </div>

        {/* Workflow Toggle */}
        <div className="col-span-5 space-y-2">
          <span className="text-[9px] font-bold text-gray-600 uppercase">Source Workflow</span>
          <div className="grid grid-cols-1 gap-1">
            <button 
              disabled={!subInfo.hasSubtitles || isProcessing}
              onClick={() => actions.updateVideoData(video.id, { workflowMode: subInfo.subType === 'embedded' ? 'embedded' : 'srt' })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                isSourceActive ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10 disabled:opacity-20'
              }`}
            >
              <LinkIcon size={12} /> Use Local {subInfo.subType || 'SRT'}
            </button>
            <button 
              disabled={isProcessing}
              onClick={() => actions.updateVideoData(video.id, { workflowMode: 'whisper' })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                isWhisperActive ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'
              }`}
            >
              <Cpu size={12} /> Force AI Whisper
            </button>
          </div>
        </div>

        {/* Primary Action */}
        <div className="col-span-4 flex flex-col justify-end gap-2">
          <button 
            onClick={() => setShowOffsets(!showOffsets)}
            className={`text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-colors ${showOffsets ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <Clock size={12} /> {video.syncOffset ? `${video.syncOffset}s Offset` : 'Set Offset'}
          </button>
          <button 
            disabled={isProcessing}
            onClick={() => actions.process([video])}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <Play size={12} fill="currentColor" /> Run Studio
          </button>
        </div>
      </div>

      {/* PROGRESS BAR (Only if active) */}
      {isProcessing && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden rounded-b-xl">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${video.progress}%` }}
          />
        </div>
      )}

      {/* OFFSET DRAWER */}
      {showOffsets && (
        <div className="px-4 py-3 bg-indigo-500/5 border-t border-white/5 flex items-center gap-4 animate-in slide-in-from-top-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase">Synchronization Offset (Seconds)</span>
          <input 
            type="number" step="0.1"
            value={video.syncOffset || 0}
            onChange={(e) => actions.updateVideoData(video.id, { syncOffset: parseFloat(e.target.value) || 0 })}
            className="bg-black border border-white/10 rounded px-3 py-1 text-xs font-mono text-indigo-400 w-20 outline-none focus:border-indigo-500"
          />
        </div>
      )}

      <SubImportModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        videoName={video.fileName}
        // modal logic handled here...
      />
    </div>
  );
}