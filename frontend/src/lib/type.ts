export type ProcessingStatus = 'idle' | 'scanning' | 'transcribing' | 'translating' | 'muxing' | 'done' | 'error';

export interface SubtitleStream {
  id: string;
  language: string;
  isExternal: boolean;
  path?: string;      // For external .srt files
  codec?: string;     // e.g., 'subrip', 'mov_text'
  isSdh: boolean;     // Subtitles for Deaf and Hard of Hearing (more complete)
  fileSize?: number;  // Used for our "Heaviest/Longest" heuristic
}

export interface AudioStream {
  id: string;
  language: string;
  title?: string;
}

export interface VideoFile {
  id: string;
  fileName: string;
  filePath: string;
  extension: string;
  audioStreams: AudioStream[];
  internalSubtitles: SubtitleStream[];
  externalSubtitles: SubtitleStream[];
  status: ProcessingStatus;
  progress: number; // 0 to 100
  currentTask?: string;
  
  // User selections for this specific file
  outputLanguages: string[];
  shouldMux: boolean;
  shouldRemoveOriginal: boolean;
}

export interface ScanResponse {
  rootPath: string;
  files: VideoFile[];
}