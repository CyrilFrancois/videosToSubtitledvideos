/**
 * Detailed statuses matching the Backend Task Manager events.
 */
export type ProcessingStatus = 
  | 'idle' 
  | 'queued' 
  | 'contextualizing' 
  | 'transcribing' 
  | 'refining' 
  | 'translating' 
  | 'muxing' 
  | 'done' 
  | 'error' 
  | 'interrupted' 
  | 'cancelled' 
  | 'folder';

export interface SubtitleInfo {
  hasSubtitles: boolean;
  subType: 'embedded' | 'external' | 'mixed' | null;
  languages: string[];
  count: number;
  srtPath?: string; 
}

export interface VideoFile {
  id: string; 
  fileName: string;
  filePath: string;
  extension?: string;
  is_directory: boolean;
  
  subtitleInfo?: SubtitleInfo;
  
  // UI State
  status: ProcessingStatus;
  progress: number;
  statusText?: string;

  // Tree Structure
  children?: VideoFile[] | null;

  // Per-file settings (Overrides global settings)
  sourceLang?: string[];
  targetLanguages?: string[];
  workflowMode?: 'hybrid' | 'whisper' | 'srt';
  syncOffset?: number;
  /** If true, the muxing engine will strip all existing internal subtitle tracks */
  stripExistingSubs?: boolean; 
}

/**
 * Global configuration state
 */
export interface GlobalSettings {
  sourceLang: string[];
  targetLanguages: string[];
  workflowMode: 'hybrid' | 'whisper' | 'srt';
  modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  autoGenerate: boolean;
  shouldMux: boolean;
  shouldRemoveOriginal: boolean;
  /** Global default for stripping existing subtitles */
  stripExistingSubs: boolean; 
}

export interface StudioState {
  items: VideoFile[];
  selectedIds: Set<string>;
  logs: Record<string, string[]>;
  isScanning: boolean;
  currentPath: string;
  settings: GlobalSettings;
}

export interface ScanResponse {
  status: string;
  currentPath: string;
  files: VideoFile[];
}

/**
 * Payload sent to POST /api/process
 */
export interface ProcessRequest {
  videos: Array<{
    name: string;
    path: string;
    src: string;
    out: string[];
    workflowMode: string;
    syncOffset: number;
    /** Instructions for the FFmpeg engine on a per-video basis */
    stripExistingSubs: boolean; 
  }>;
  globalOptions: {
    transcriptionEngine: string;
    generateSRT: boolean;
    muxIntoMkv: boolean;
    cleanUp: boolean;
  };
}