"use client";

import React, { useState, useCallback } from 'react';
import { X, Upload, Globe, FileText, Search, AlertCircle } from 'lucide-react';

interface SubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoName: string; 
  videoPath: string; 
  onFileSelect: (file: File, targetName: string, destinationPath: string) => void;
}

export default function SubImportModal({ isOpen, onClose, videoName, videoPath, onFileSelect }: SubImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Helper: "MyVideo.mp4" -> "MyVideo"
  const baseName = videoName.replace(/\.[^/.]+$/, "");

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  }, []);

  const processFile = (file: File) => {
    if (file.name.endsWith('.srt')) {
      onFileSelect(file, `${baseName}.srt`, videoPath);
    } else {
      alert("Please upload a valid .srt file");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [baseName, videoPath]);

  /**
   * Enhanced Search Logic
   * Cleans alphanumeric characters and formats URLs per provider
   */
  const openSearch = (provider: 'subdl' | 'yts' | 'opensubs') => {
    // 1. Clean string: Replace non-alphanumeric (dots, dashes) with spaces
    const cleanBase = baseName.replace(/[^a-z0-9]/gi, ' ').trim();
    
    // 2. Refine spaces for standard providers (SubDL, YTS)
    const spaceQuery = cleanBase.replace(/\s+/g, ' '); 
    
    // 3. Refine for OpenSubtitles (requires '+')
    const plusQuery = spaceQuery.replace(/\s+/g, '+');

    let url = '';
    
    switch(provider) {
      case 'subdl':
        url = `https://subdl.com/search/${encodeURIComponent(spaceQuery)}`;
        break;
        
      case 'yts':
        url = `https://yts-subs.com/search/${encodeURIComponent(spaceQuery)}`;
        break;
        
      case 'opensubs':
        url = `https://www.opensubtitles.com/en/en/search-all/q-${plusQuery}/hearing_impaired-include/machine_translated-/trusted_sources-`;
        break;
    }

    if (url) {
      window.open(url, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative bg-[#121212] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="text-indigo-400" size={20} />
              Import Subtitles
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Context Info */}
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 mb-6">
            <p className="text-[10px] text-indigo-300 uppercase font-bold mb-1 flex items-center gap-1">
              <AlertCircle size={10} /> Target Destination
            </p>
            <p className="text-[10px] text-gray-500 font-mono truncate mb-2">
              Path: {videoPath || './'}
            </p>
            <p className="text-xs text-gray-200 font-mono truncate bg-black/40 p-1.5 rounded border border-white/5">
              {baseName}<span className="text-indigo-400 font-bold">.srt</span>
            </p>
          </div>

          {/* Drag 'n Drop Zone */}
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all
              ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'}
            `}
          >
            <Upload className={`mb-3 ${isDragging ? 'text-indigo-400' : 'text-gray-600'}`} size={32} />
            <p className="text-sm text-gray-300 font-medium text-center">
              Drop <span className="text-indigo-400 font-bold">.srt</span> file here
            </p>
            <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-tighter font-bold italic">or click to browse local files</p>
            <input 
              type="file" 
              accept=".srt"
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
            />
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-[#121212] px-4 text-gray-500">External Providers</span>
            </div>
          </div>

          {/* Multi-Provider Search Buttons */}
          <div className="space-y-2">
            <button 
              onClick={() => openSearch('opensubs')}
              className="w-full group flex items-center justify-between p-3 bg-white/[0.01] border border-white/5 rounded-xl hover:border-orange-500/50 transition-all hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
                  <Globe size={16} />
                </div>
                <p className="text-xs font-bold text-gray-300">Search on OpenSubtitles</p>
              </div>
              <Search size={14} className="text-gray-600 group-hover:text-orange-400" />
            </button>
            
            <button 
              onClick={() => openSearch('subdl')}
              className="w-full group flex items-center justify-between p-3 bg-white/[0.01] border border-white/5 rounded-xl hover:border-indigo-500/50 transition-all hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  <Globe size={16} />
                </div>
                <p className="text-xs font-bold text-gray-300">Search on Subdl</p>
              </div>
              <Search size={14} className="text-gray-600 group-hover:text-indigo-400" />
            </button>

            <button 
              onClick={() => openSearch('yts')}
              className="w-full group flex items-center justify-between p-3 bg-white/[0.01] border border-white/5 rounded-xl hover:border-emerald-500/50 transition-all hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Globe size={16} />
                </div>
                <p className="text-xs font-bold text-gray-300">Search on YTS-Subs</p>
              </div>
              <Search size={14} className="text-gray-600 group-hover:text-emerald-400" />
            </button>
          </div>
        </div>
        
        {/* Footer Note */}
        <div className="bg-indigo-500/5 p-4 text-center border-t border-white/5">
          <p className="text-[9px] text-gray-600 leading-relaxed px-4">
            Uploaded files are processed immediately. If a conflict occurs, a numerical suffix is added to ensure your data remains safe.
          </p>
        </div>
      </div>
    </div>
  );
}