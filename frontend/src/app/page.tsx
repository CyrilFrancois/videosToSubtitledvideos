"use client";

import React, { useState } from 'react';
import { 
  FolderOpen, 
  Settings, 
  Play, 
  CheckCircle2, 
  Clock, 
  Languages, 
  Video,
  ChevronRight
} from 'lucide-react';

export default function Dashboard() {
  // Mock State for the layout demonstration
  const [selectedFolder, setSelectedFolder] = useState("/data/movies/the_bear");
  
  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-gray-100 overflow-hidden font-sans">
      
      {/* 1. STICKY LEFT SIDEBAR */}
      <aside className="w-80 h-full border-r border-white/10 bg-[#0f0f0f] flex flex-col sticky top-0 shrink-0">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            AI MEDIA SUITE
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Section: Source */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">
              <FolderOpen size={16} /> <span>SOURCE SELECTION</span>
            </div>
            <button className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm flex items-center justify-between transition-all">
              <span>Select Folder</span>
              <ChevronRight size={14} className="text-gray-500" />
            </button>
            <div className="p-3 bg-black/40 rounded border border-white/5 text-xs font-mono text-gray-500 truncate">
              {selectedFolder}
            </div>
          </section>

          {/* Section: Global Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">
              <Settings size={16} /> <span>GLOBAL SETTINGS</span>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-transparent checked:bg-green-500" defaultChecked />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Mux to MKV</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-transparent" />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Remove Original</span>
              </label>
            </div>

            <div className="pt-2">
              <label className="text-xs text-gray-500 block mb-2">TARGET LANGUAGES</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-green-500">
                <option>French (Default)</option>
                <option>English</option>
                <option>Japanese</option>
              </select>
            </div>
          </section>
        </div>

        {/* Global Action Button */}
        <div className="p-6 border-t border-white/10">
          <button className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all">
            <Play size={18} fill="currentColor" />
            PROCESS ALL
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Global Progress */}
        <header className="p-8 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
          <div className="max-w-5xl mx-auto flex items-end justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Global Status</p>
              <h2 className="text-2xl font-bold">4 / 12 Videos Processed</h2>
            </div>
            <div className="text-right text-sm font-mono text-green-400">33.3% COMPLETE</div>
          </div>
          <div className="max-w-5xl mx-auto h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 w-1/3 shadow-[0_0_15px_rgba(34,197,94,0.4)]"></div>
          </div>
        </header>

        {/* Video List (Scrollable) */}
        <section className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-4">
            
            {/* Example Video Card: Processing State */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Video size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">The.Bear.S01E01.mp4</h3>
                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                      <span>Audio: EN</span>
                      <span className="text-white/20">|</span>
                      <span>Subs: FR, EN (External)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 animate-pulse">
                  TRANSCRIBING...
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400 font-mono">
                  <span>Progress</span>
                  <span>45%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[45%]"></div>
                </div>
                <p className="text-[10px] text-gray-500 uppercase tracking-tight">Current Task: OpenAI Whisper running speech-to-text...</p>
              </div>
            </div>

            {/* Example Video Card: Completed State */}
            <div className="p-5 bg-white/5 border border-green-500/30 rounded-2xl hover:border-green-500/50 transition-all space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-1 bg-green-500 text-black rounded-bl-lg">
                <CheckCircle2 size={14} strokeWidth={3} />
              </div>
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                    <Video size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-300">The.Bear.S01E02.mkv</h3>
                    <p className="text-xs text-green-500/70 mt-1">Status: Success • Saved to data/outputs/</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-green-400 hover:text-green-300 underline">REPLAY JOB</button>
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}