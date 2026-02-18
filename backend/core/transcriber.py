import os
import logging
import ffmpeg
from faster_whisper import WhisperModel
from typing import Callable
from pathlib import Path

logger = logging.getLogger("SubStudio.Transcriber")

class VideoTranscriber:
    def __init__(self, model_size: str = "base"):
        """
        Initializes the Faster-Whisper model.
        device="cpu" is standard for Docker; compute_type="int8" is optimized for CPU speed.
        """
        logger.info(f"💾 Loading Faster-Whisper model: [{model_size}]...")
        # Using cpu + int8 is the most stable configuration for containerized environments
        self.model = WhisperModel(model_size, device="cpu", compute_type="int8")

    def extract_audio(self, video_path: str) -> str:
        """
        Extracts mono 16k WAV file for Whisper.
        Uses .tmp.wav extension to distinguish from user files.
        """
        # Ensure we use a consistent naming convention that the orchestrator can track
        audio_path = str(Path(video_path).with_suffix(".tmp.wav"))
        logger.info(f"Extracting audio for AI analysis...")
        
        try:
            (
                ffmpeg
                .input(video_path)
                .output(
                    audio_path, 
                    acodec='pcm_s16le', 
                    ac=1, 
                    ar='16k', 
                    vn=None, 
                    sn=None
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            return audio_path
        except ffmpeg.Error as e:
            err = e.stderr.decode() if e.stderr else str(e)
            logger.error(f"❌ Audio extraction failed: {err}")
            return ""

    def format_timestamp(self, seconds: float) -> str:
        """Standard SRT format: HH:MM:SS,mmm"""
        seconds = max(0, seconds)
        milliseconds = int(round(seconds * 1000))
        
        hours = milliseconds // 3600000
        milliseconds %= 3600000
        minutes = milliseconds // 60000
        milliseconds %= 60000
        secs = milliseconds // 1000
        ms = milliseconds % 1000

        return f"{hours:02}:{minutes:02}:{secs:02},{ms:03}"

    def transcribe(
        self, 
        video_path: str, 
        file_id: str, 
        on_progress: Callable,
        current_file: int,
        total_files: int
    ) -> str:
        audio_file = ""
        file_prefix = f"[{current_file}/{total_files} Files]"
        
        try:
            # 1. Audio Extraction
            on_progress(file_id, "transcribing", 5, f"{file_prefix} Step 2/5: Extracting audio...")
            audio_file = self.extract_audio(video_path)
            
            if not audio_file or not os.path.exists(audio_file):
                raise Exception("Could not prepare audio for transcription.")

            # 2. AI Inference
            logger.info(f"Faster-Whisper inference starting...")
            
            # Using segments as a generator to keep memory usage low
            segments, info = self.model.transcribe(
                audio_file, 
                beam_size=5, 
                word_timestamps=True,
                condition_on_previous_text=False # Prevents "looping" text bugs in AI
            )
            
            total_duration = info.duration
            srt_blocks = []
            last_logged_pct = -1

            # 3. Process Segments and Update Progress
            for segment in segments:
                # Calculate progress (mapping 10% -> 90% of the total progress bar)
                progress_val = 10 + int((segment.end / total_duration) * 80)
                
                on_progress(
                    file_id, 
                    "transcribing", 
                    progress_val, 
                    f"{file_prefix} Step 2/5: Transcribing ({int((segment.end / total_duration) * 100)}%)"
                )

                # Terminal logging every 10%
                current_pct = int((segment.end / total_duration) * 100)
                if current_pct >= last_logged_pct + 10:
                    logger.info(f"Transcription Progress: {current_pct}%")
                    last_logged_pct = (current_pct // 10) * 10

                start = self.format_timestamp(segment.start)
                end = self.format_timestamp(segment.end)
                text = segment.text.strip()
                
                if text:
                    srt_blocks.append(f"{len(srt_blocks) + 1}\n{start} --> {end}\n{text}\n")

            on_progress(file_id, "transcribing", 95, f"{file_prefix} Step 2/5: Finalizing subtitles...")
            logger.info(f"Transcription complete. Generated {len(srt_blocks)} segments.")
            
            return "\n".join(srt_blocks)

        except Exception as e:
            logger.error(f"❌ {file_prefix} Transcription error: {str(e)}")
            raise e
        finally:
            # Internal Cleanup: Ensure the .tmp.wav is deleted immediately after use
            if audio_file and os.path.exists(audio_file):
                try:
                    os.remove(audio_file)
                    logger.info(f"Cleaned up temporary audio: {os.path.basename(audio_file)}")
                except Exception as cleanup_err:
                    logger.warning(f"   {file_prefix} ⚠️ Internal cleanup failed: {cleanup_err}")