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

    def extract_audio(self, video_path: str, task_manager: Any) -> str:
        """
        Extracts audio via FFmpeg async to allow PID tracking.
        """
        audio_path = video_path.rsplit('.', 1)[0] + ".temp.wav"
        logger.info(f"🔊 [FFMPEG] Extracting audio: {os.path.basename(audio_path)}")
        
        # Register artifact immediately so it can be cleaned up if killed
        task_manager.register_artifact(audio_path)

        try:
            # We use run_async to capture the process handle
            process = (
                ffmpeg
                .input(video_path)
                .output(audio_path, acodec='pcm_s16le', ac=1, ar='16k')
                .overwrite_output()
                .run_async(pipe_stdin=True, quiet=True)
            )

            # Pass the PID to the task manager so the kill switch works
            task_manager.active_pid = process.pid
            logger.info(f"⚙️ [FFMPEG] PID: {process.pid} started extraction")

            # Wait for FFmpeg to finish
            process.wait()
            
            # Reset PID after process finishes
            task_manager.active_pid = None
            return audio_path

        except Exception as e:
            logger.error(f"❌ [FFMPEG] Audio extraction failed: {e}")
            task_manager.active_pid = None
            return video_path

    def format_timestamp(self, seconds: float) -> str:
        """Converts seconds to SRT timestamp format: HH:MM:SS,mmm"""
        tdelta = str(float(seconds)).split('.')
        secs = int(tdelta[0])
        milli = int(tdelta[1][:3]) if len(tdelta) > 1 else 0
        
        hours = secs // 3600
        minutes = (secs % 3600) // 60
        seconds = secs % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milli:03d}"

    def transcribe(self, video_path: str, file_id: str, on_progress: Callable, task_manager: Any):
        """Runs the transcription and yields SRT content."""
        
        # 1. Extraction
        audio_file = self.extract_audio(video_path, task_manager)
        
        # Check for user abort after audio extraction
        if task_manager.is_aborted:
            return None

        on_progress(file_id, "transcribing", 10, "AI is listening to audio...")
        logger.info(f"🤖 [WHISPER] Starting inference on {os.path.basename(audio_file)}")

        # 2. Transcription
        # Note: whisper.model.transcribe runs in-process. 
        # For a hard-kill on this, the task manager kills the parent python process
        # or we check task_manager.is_aborted inside the segment loop.
        result = self.model.transcribe(
            audio_file, 
            verbose=False,
            fp16=False # Set to True if using NVIDIA GPU
        )

        srt_content = ""
        segments = result.get('segments', [])
        total_segments = len(segments)

        logger.info(f"📝 [WHISPER] Processing {total_segments} audio segments")

        for i, segment in enumerate(segments):
            # Check for mid-transcription abort
            if task_manager.is_aborted:
                logger.warning(f"🛑 [WHISPER] Abort detected during segment {i}")
                return None

            start = self.format_timestamp(segment['start'])
            end = self.format_timestamp(segment['end'])
            text = segment['text'].strip()
            
            srt_content += f"{i + 1}\n{start} --> {end}\n{text}\n\n"
            
            # Progress scaled 20% to 90%
            progress_val = 20 + int((i / total_segments) * 70)
            
            if i % 10 == 0:
                logger.info(f"🧵 [WHISPER] Progress: {progress_val}% | {text[:30]}...")
                on_progress(file_id, "transcribing", progress_val, f"Listening: {text[:20]}...")

        # 3. Cleanup temp audio (if not already handled by TaskManager)
        if audio_file.endswith(".temp.wav") and os.path.exists(audio_file):
            try:
                os.remove(audio_file)
                logger.info(f"🗑️ [WHISPER] Cleaned up temporary audio.")
            except:
                pass

        on_progress(file_id, "transcribing", 100, "Initial transcription finished!")
        return srt_content