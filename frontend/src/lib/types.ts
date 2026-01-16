/**
 * Detailed statuses matching the Backend Task Manager events.
 * This allows the VideoCard and GlobalProgress to show specific AI stages.
 */
export type ProcessingStatus = 
  | 'idle' 
  | 'queued'          // Waiting in the linear queue
  | 'contextualizing' // Phase 0: GPT researching the movie context
  | 'transcribing'    // Phase 1: Whisper/Audio extraction
  | 'refining'        // Phase 2: GPT correcting Whisper hallucinations
  | 'translating'     // Phase 3: Final language generation
  | 'muxing'          // Phase 4: FFmpeg merging streams
  | 'done'            // Success
  | 'error'           // Failure
  | 'interrupted'     // Active job was killed by the "Abort" switch
  | 'cancelled'       // Queued job was removed during an Abort
  | 'folder';

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
  has_matching_srt: boolean; 
  
  // UI State - Driven by SSE events
  status: ProcessingStatus;
  progress: number;    // 0 to 100
  currentTask?: string; // Descriptive text (e.g., "Correcting phonetic errors...")

  // Tree Structure
  children?: VideoFile[];

  // Processing Settings (Per-file overrides)
  selectedSourceLang?: string;
  selectedTargetLangs?: string[];
  workflowOverride?: 'hybrid' | 'force_ai';
}

export interface ScanResponse {
  status: string;
  currentPath: string;
  files: VideoFile[];
}

/**
 * Matches the ProcessRequest Pydantic model in backend/main.py
 */
export interface ProcessSettings {
  fileIds: string[];
  sourceLang: string;
  targetLanguages: string[];
  workflowMode: 'hybrid' | 'force_ai';
  shouldRemoveOriginal: boolean;
  shouldMux: boolean;
  modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large';
}