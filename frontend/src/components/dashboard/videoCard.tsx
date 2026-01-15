"use client";

import React, { useState } from 'react';
import { 
  FileVideo, Play, XCircle, CheckCircle2, Folder, 
  Volume2, Text, Link as LinkIcon, ChevronRight, Plus, 
  Settings2, Clock, Languages, Database, Upload, Cpu
} from 'lucide-react';

export default function VideoCard({ video, onStart, onCancel, onNavigate, isSelected, toggleSelection }) {
  const isDir = video.is_directory;
  const [showOffsets, setShowOffsets] = useState(false);
  
  // Handlers
  const handleFolderClick = (e) => {
    e.stopPropagation();
    if (isDir) onNavigate(video.filePath);
  };

  if (isDir) {
    return (
      <div 
        onClick={handleFolderClick}
        className="group mb-2 p-3 bg-[#0d0d0d] border border-white/5 rounded-lg flex items-center gap-4 cursor-pointer hover:bg-white/[0.02] transition-all"
      >
        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
          <Folder size={20} fill="currentColor" className="opacity-70" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
            {video.fileName}
          </h3>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Directory</p>
        </div>
        <ChevronRight size={16} className="text-gray-600 group-hover:text-indigo-400 transition-colors" />
      </div>
    );
  }

  // Status Accent
  const statusAccent = video.status === 'processing' ? 'border-l-indigo-500' : 
                      video.status === 'done' ? 'border-l-emerald-500' : 'border-l-transparent';

  return (
    <div className={`mb-4 bg-[#0d0d0d] border border-white/5 rounded-lg overflow-hidden transition-all ${statusAccent} border-l-4`}>
      
      {/* TOP TIER: IDENTITY */}
      <div className="flex items-start justify-between p-4 bg-white/[0.01]">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <h3 className="text-base font-semibold text-slate-100 truncate max-w-xl">{video.fileName}</h3>
            <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-500 text-[10px] font-mono border border-white/10 uppercase">
              {video.extension}
            </span>
          </div>
          
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-blue-400/80 font-mono">
              <Volume2 size={12} /> EN 5.1
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400/80 font-mono">
              <Text size={12} /> FR (Internal)
            </div>
            {/* Show if file exists on disk */}
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/80 font-mono italic">
              <LinkIcon size={12} /> matching .srt found
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className={`text-[10px] font-mono uppercase tracking-widest font-black ${video.status === 'processing' ? 'text-indigo-400 animate-pulse' : 'text-gray-600'}`}>
            {video.status}
          </p>
          <p className="text-[10px] text-gray-700 font-mono mt-1">1.2 GB / 22:14</p>
        </div>
      </div>

      {/* MIDDLE TIER: TRANSLATION & LANGUAGE COCKPIT */}
      <div className="px-4 py-3 border-t border-white/5 flex flex-wrap items-end gap-6">
        
        {/* 1. Language Setup (Vertical Stack) */}
        <div className="space-y-2">
          <label className="text-[9px] text-gray-600 uppercase font-black tracking-tighter">Language Setup</label>
          <div className="flex flex-col gap-1">
            <button className="flex items-center justify-between w-32 px-2 py-1.5 bg-black border border-white/10 rounded text-[10px] text-blue-400 font-mono hover:border-indigo-500/50 transition-colors">
              <span className="text-gray-600 mr-2">SRC:</span> EN (Audio)
            </button>
            <button className="flex items-center justify-between w-32 px-2 py-1.5 bg-black border border-white/10 rounded text-[10px] text-indigo-400 font-mono hover:border-indigo-500/50 transition-colors">
              <span className="text-gray-600 mr-2">OUT:</span> FR, ES, IT
            </button>
          </div>
        </div>

        {/* 2. Translation Logic (Primary Mode) */}
        <div className="space-y-2">
          <label className="text-[9px] text-gray-600 uppercase font-black tracking-tighter">Workflow Mode</label>
          <div className="flex items-center gap-1 bg-black p-1 rounded border border-white/10">
            <button className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold bg-indigo-500 text-white rounded uppercase shadow-lg">
              <LinkIcon size={12} /> Use Detected SRT
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-gray-500 hover:text-gray-300 uppercase">
              <Upload size={12} /> Custom File
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-gray-500 hover:text-gray-300 uppercase">
              <Cpu size={12} /> AI Whisper
            </button>
          </div>
        </div>

        {/* 3. Sync Toggle */}
        <div className="mb-1">
          <button 
            onClick={() => setShowOffsets(!showOffsets)}
            className={`flex items-center gap-2 px-4 py-2 rounded border text-[10px] font-black uppercase transition-all ${
              showOffsets ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/20'
            }`}
          >
            <Clock size={14} /> {showOffsets ? 'Close Sync' : 'Add Sync Offset'}
          </button>
        </div>

        {/* 4. Action Launchpad */}
        <div className="ml-auto flex items-center gap-3 pl-6 border-l border-white/5">
           {video.status === 'processing' ? (
              <button onClick={() => onCancel(video.id)} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded font-black text-[10px] uppercase hover:bg-red-500 hover:text-white transition-all">
                <XCircle size={14} /> Terminate
              </button>
           ) : video.status === 'done' ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded font-black text-[10px] uppercase">
                <CheckCircle2 size={14} /> Ready
              </div>
           ) : (
              <button onClick={() => onStart(video.id)} className="flex items-center gap-2 px-6 py-2 bg-indigo-500 text-white rounded font-black text-[11px] uppercase shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95 transition-all">
                <Play size={14} fill="currentColor" /> Start Job
              </button>
           )}
        </div>
      </div>

      {/* HIDDEN OFFSET LINE (Animated Dropdown) */}
      {showOffsets && (
        <div className="px-4 py-3 bg-black/40 border-t border-white/5 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-500 uppercase">Marker A:</span>
            <input type="text" placeholder="00:00:00" className="bg-black border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-indigo-400 w-24 outline-none focus:border-indigo-500" />
            <span className="text-gray-600">→</span>
            <input type="number" placeholder="+0.0s" className="bg-black border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-indigo-400 w-16 outline-none focus:border-indigo-500" />
          </div>
          <button className="p-1.5 hover:bg-white/10 rounded text-gray-500">
            <Plus size={14} />
          </button>
          <p className="text-[9px] text-gray-600 italic ml-4">Offsets apply from the specified timestamp to end of file.</p>
        </div>
      )}

      {/* PROGRESS AREA */}
      {video.status === 'processing' && (
        <div className="px-4 pb-4 pt-2">
          <div className="flex w-full h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-emerald-500 w-[33%] border-r border-black/50" />
            <div className="h-full bg-indigo-500 w-[45%] animate-pulse border-r border-black/50" />
            <div className="h-full bg-white/5 w-[22%]" />
          </div>
        </div>
      )}
    </div>
  );
}