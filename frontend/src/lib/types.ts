export type ProcessingStatus = 'idle' | 'processing' | 'done' | 'error' | 'folder';

export interface SubtitleInfo {
  hasSubtitles: boolean;
  subType: 'embedded' | 'external' | 'external_isolated' | null;
  languages: string[];
  count: number;
}

export interface VideoFile {
  id: string;          // Full path from backend
  fileName: string;
  filePath: string;
  extension?: string;
  is_directory: boolean;
  
  // Smart Metadata from scanner.py
  subtitleInfo?: SubtitleInfo;
  has_matching_srt: boolean; // Backward compatibility
  
  // UI State
  status: ProcessingStatus;
  progress: number;    // 0 to 100
  currentTask?: string;

  // Tree Structure
  children?: VideoFile[];

  // Processing Settings (for the Execute Job call)
  selectedSourceLang?: string;
  selectedTargetLangs?: string[];
  workflowOverride?: 'srt' | 'whisper' | 'external';
}

export interface ScanResponse {
  status: string;
  currentPath: string;
  files: VideoFile[];
}

export interface ProcessSettings {
  fileIds: string[];
  sourceLang: string;
  targetLanguages: string[];
  workflowMode: 'hybrid' | 'force_ai';
  shouldRemoveOriginal: boolean;
}