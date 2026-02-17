/**
 * Detailed statuses matching the Backend Task Manager events.
 * This drives the UI animations and progress indicators.
 */
export type ProcessingStatus = 
  | 'idle' 
  | 'queued'          // Waiting in the linear queue
  | 'contextualizing' // Phase 0: LLM researching movie/series context
  | 'transcribing'    // Phase 1: Whisper running audio extraction
  | 'refining'         // Phase 2: LLM correcting Whisper hallucinations
  | 'translating'     // Phase 3: Final language generation
  | 'muxing'          // Phase 4: FFmpeg merging streams
  | 'done'            // Success
  | 'error'           // Failure
  | 'interrupted'     // Active job killed by user
  | 'cancelled'       // Queued job removed
  | 'folder';         // Directory item

export interface SubtitleInfo {
  hasSubtitles: boolean;
  subType: 'embedded' | 'external' | 'mixed' | null;
  languages: string[];
  count: number;
  srtPath?: string;   // Path to sidecar .srt if found
}

export interface VideoFile {
  id: string;         // Unique identifier (usually filePath)
  fileName: string;
  filePath: string;
  extension?: string;
  is_directory: boolean;
  
  // Metadata from scanner.py
  subtitleInfo?: SubtitleInfo;
  
  // UI State - Updated via SSE
  status: ProcessingStatus;
  progress: number;    // 0 to 100
  statusText?: string; // Descriptive text (e.g., "AI is translating to French...")

  // Tree Structure
  children?: VideoFile[] | null;

  // Per-file settings (Overrides global settings)
  sourceLang?: string[];
  targetLanguages?: string[];
  workflowMode?: 'hybrid' | 'whisper' | 'srt';
  syncOffset?: number;
}

/**
 * Global configuration state for the Sidebar and Batch Processing
 */
export interface GlobalSettings {
  sourceLang: string[];
  targetLanguages: string[];
  workflowMode: 'hybrid' | 'whisper' | 'srt';
  modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  autoGenerate: boolean;
  shouldMux: boolean;
  shouldRemoveOriginal: boolean;
}

/**
 * The Master State Object used by the StudioContext
 */
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
    srtFoundPath: string;
    src: string;
    out: string[];
    workflowMode: string;
    syncOffset: number;
  }>;
  globalOptions: {
    transcriptionEngine: string;
    generateSRT: boolean;
    muxIntoMkv: boolean;
    cleanUp: boolean;
  };
}