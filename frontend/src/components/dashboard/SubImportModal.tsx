"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { X, Upload, Globe, FileText, Search, AlertCircle, Loader2 } from 'lucide-react';

interface SubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoName: string; 
  videoPath: string; 
  onFileSelect: (file: File, targetName: string, destinationPath: string) => Promise<void>;
}

export default function SubImportModal({ isOpen, onClose, videoName, videoPath, onFileSelect }: SubImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 1. CLEAN FILENAME LOGIC
  // Removes extensions and common "Scene" noise for better search results
  const baseName = useMemo(() => {
    return videoName
      .replace(/\.[^/.]+$/, "") // Remove extension
      .replace(/\b(1080p|720p|2160p|4k|bluray|x264|x265|h264|h265|web-dl|brrip|dvdrip)\b/gi, "") // Remove quality tags
      .replace(/[._]/g, " ") // Replace dots/underscores with spaces
      .trim();
  }, [videoName]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.srt')) {
      alert("Invalid format. Please provide a standard .srt file.");
      return;
    }

    try {
      setIsUploading(true);
      // Construct the final target name based on the original video name
      const targetSrtName = videoName.replace(/\.[^/.]+$/, ".srt");
      await onFileSelect(file, targetSrtName, videoPath);
      onClose();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [videoName, videoPath]);

  const openSearch = (provider: 'subdl' | 'yts' | 'opensubs') => {
    const query = encodeURIComponent(baseName);
    const providers = {
      subdl: `https://subdl.com/search/${query}`,
      yts: `https://yts-subs.com/search/${query}`,
      opensubs: `https://www.opensubtitles.org/en/search2/sublanguageid-all/moviename-${query.replace(/%20/g, '+')}`
    };
    window.open(providers[provider], '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 pb-0 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <FileText className="text-indigo-400" size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Manual Import</h3>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">Inject external SRT into workspace</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Target Visualizer */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={12} className="text-indigo-500" />
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Target Pairing</span>
            </div>
            <div className="space-y-2">
              <div className="text-[11px] text-gray-400 font-mono truncate opacity-50">{videoPath}/</div>
              <div className="text-xs text-indigo-100 font-mono flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                {videoName.replace(/\.[^/.]+$/, "")}
                <span className="text-indigo-500 font-black">.srt</span>
              </div>
            </div>
          </div>

          {/* Drag 'n Drop Zone */}
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 group
              ${isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' : 'border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/20'}
              ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            `}
          >
            {isUploading ? (
              <Loader2 className="mb-3 text-indigo-500 animate-spin" size={32} />
            ) : (
              <Upload className={`mb-3 transition-transform duration-300 ${isDragging ? 'translate-y-[-4px] text-indigo-400' : 'text-gray-600 group-hover:text-gray-400'}`} size={32} />
            )}
            
            <p className="text-sm text-gray-300 font-bold mb-1">
              {isUploading ? 'Uploading to server...' : 'Drop SRT file here'}
            </p>
            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">or click to browse local storage</p>
            
            <input 
              type="file" 
              accept=".srt"
              disabled={isUploading}
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
            />
          </div>

          {/* Provider Search */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 mb-3">
              <div className="h-[1px] flex-1 bg-white/5" />
              <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">External Lookup</span>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ProviderButton icon={<Globe size={14}/>} label="OpenSubs" color="hover:border-orange-500/50" onClick={() => openSearch('opensubs')} />
              <ProviderButton icon={<Globe size={14}/>} label="SubDL" color="hover:border-indigo-500/50" onClick={() => openSearch('subdl')} />
              <ProviderButton icon={<Globe size={14}/>} label="YTS" color="hover:border-emerald-500/50" onClick={() => openSearch('yts')} />
            </div>
          </div>
        </div>
        
        {/* Security Note */}
        <div className="bg-black p-4 text-center border-t border-white/5">
          <p className="text-[9px] text-gray-700 font-medium leading-relaxed px-6">
            SubStudio strictly monitors the file system. Uploaded SRTs are automatically renamed to match the video stream for seamless muxing.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProviderButton({ icon, label, color, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl transition-all hover:bg-white/[0.05] ${color} group`}
    >
      <div className="text-gray-600 group-hover:text-white transition-colors">{icon}</div>
      <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-300">{label}</span>
    </button>
  );
}