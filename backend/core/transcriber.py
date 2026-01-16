import os
import subprocess
import whisper
import ffmpeg
import logging
from pathlib import Path
from typing import Callable, Any

logger = logging.getLogger("SubStudio.Transcriber")

class VideoTranscriber:
    def __init__(self, model_size: str = "base"):
        # Models: tiny, base, small, medium, large
        logger.info(f"💾 Loading Whisper model: {model_size}...")
        self.model = whisper.load_model(model_size)
        # Constant offset to sync subtitles with audio
        self.TIME_OFFSET = 0.4 

    def extract_audio(self, video_path: str, task_manager: Any) -> str:
        """Extracts audio via FFmpeg async to allow PID tracking."""
        audio_path = video_path.rsplit('.', 1)[0] + ".temp.wav"
        logger.info(f"🔊 [FFMPEG] Extracting audio: {os.path.basename(audio_path)}")
        
        task_manager.register_artifact(audio_path)

        try:
            process = (
                ffmpeg
                .input(video_path)
                .output(audio_path, acodec='pcm_s16le', ac=1, ar='16k')
                .overwrite_output()
                .run_async(pipe_stdin=True, quiet=True)
            )

            task_manager.active_pid = process.pid
            logger.info(f"⚙️ [FFMPEG] PID: {process.pid} started extraction")

            process.wait()
            task_manager.active_pid = None
            return audio_path

        except Exception as e:
            logger.error(f"❌ [FFMPEG] Audio extraction failed: {e}")
            task_manager.active_pid = None
            return video_path

    def format_timestamp(self, seconds: float) -> str:
        """Converts seconds to SRT timestamp format: HH:MM:SS,mmm"""
        # Ensure we don't have negative timestamps after offset
        seconds = max(0, seconds)
        
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        milliseconds = int(round((seconds - int(seconds)) * 1000))
        
        # Handle rounding overflow (e.g., 1000ms -> 1s)
        if milliseconds >= 1000:
            milliseconds -= 1000
            secs += 1
            if secs >= 60:
                secs -= 60
                minutes += 1
                if minutes >= 60:
                    minutes -= 60
                    hours += 1

        return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"

    def transcribe(self, video_path: str, file_id: str, on_progress: Callable, task_manager: Any):
        """Runs the transcription and yields SRT content with a time offset."""
        
        # 1. Extraction
        audio_file = self.extract_audio(video_path, task_manager)
        
        if task_manager.is_aborted:
            return None

        on_progress(file_id, "transcribing", 10, "AI is listening to audio...")
        logger.info(f"🤖 [WHISPER] Starting inference on {os.path.basename(audio_file)}")

        # 2. Transcription
        result = self.model.transcribe(
            audio_file, 
            verbose=False,
            fp16=False 
        )

        srt_content = ""
        segments = result.get('segments', [])
        total_segments = len(segments)

        logger.info(f"📝 [WHISPER] Processing {total_segments} audio segments with +{self.TIME_OFFSET}s offset")

        for i, segment in enumerate(segments):
            if task_manager.is_aborted:
                logger.warning(f"🛑 [WHISPER] Abort detected during segment {i}")
                return None

            # Apply the 0.4s offset here
            start_time = segment['start'] + self.TIME_OFFSET
            end_time = segment['end'] + self.TIME_OFFSET

            start = self.format_timestamp(start_time)
            end = self.format_timestamp(end_time)
            text = segment['text'].strip()
            
            srt_content += f"{i + 1}\n{start} --> {end}\n{text}\n\n"
            
            # Progress tracking
            progress_val = 20 + int((i / total_segments) * 70)
            
            if i % 10 == 0:
                logger.info(f"🧵 [WHISPER] Progress: {progress_val}% | {text[:30]}...")
                on_progress(file_id, "transcribing", progress_val, f"Listening: {text[:20]}...")

        # 3. Cleanup
        if audio_file.endswith(".temp.wav") and os.path.exists(audio_file):
            try:
                os.remove(audio_file)
                logger.info(f"🗑️ [WHISPER] Cleaned up temporary audio.")
            except:
                pass

        on_progress(file_id, "transcribing", 100, "Initial transcription finished!")
        return srt_content