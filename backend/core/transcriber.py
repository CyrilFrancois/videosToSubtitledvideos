import os
import logging
import ffmpeg
from faster_whisper import WhisperModel
from typing import Callable

logger = logging.getLogger("SubStudio.Transcriber")

class VideoTranscriber:
    def __init__(self, model_size: str = "base"):
        """
        Initializes the Faster-Whisper model.
        device="cpu" is standard for Docker; compute_type="int8" is optimized for CPU speed.
        """
        logger.info(f"💾 Loading Faster-Whisper model: [{model_size}]...")
        self.model = WhisperModel(model_size, device="cpu", compute_type="int8")

    def extract_audio(self, video_path: str) -> str:
        """Extracts mono 16k WAV file for Whisper."""
        audio_path = f"{os.path.splitext(video_path)[0]}.tmp.wav"
        logger.info(f"🔊 Extracting audio for AI analysis...")
        
        try:
            (
                ffmpeg
                .input(video_path)
                .output(audio_path, acodec='pcm_s16le', ac=1, ar='16k')
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
        td_hours = int(seconds // 3600)
        td_minutes = int((seconds % 3600) // 60)
        td_seconds = int(seconds % 60)
        td_milliseconds = int(round((seconds - int(seconds)) * 1000))
        
        if td_milliseconds >= 1000:
            td_milliseconds -= 1000
            td_seconds += 1

        return f"{td_hours:02}:{td_minutes:02}:{td_seconds:02},{td_milliseconds:03}"

    def transcribe(
        self, 
        video_path: str, 
        file_id: str, 
        on_progress: Callable
    ) -> str:
        audio_file = ""
        try:
            # 1. Audio Extraction
            on_progress(file_id, "transcribing", 5, "Extracting audio...")
            audio_file = self.extract_audio(video_path)
            
            if not audio_file or not os.path.exists(audio_file):
                raise Exception("Could not prepare audio for transcription.")

            # 2. AI Inference
            # segments is a generator; transcription happens as we iterate
            logger.info(f"🤖 Faster-Whisper inference starting for {file_id}")
            segments, info = self.model.transcribe(audio_file, beam_size=5)
            
            total_duration = info.duration
            srt_blocks = []

            # 3. Process Segments and Update Real Progress
            for segment in segments:
                # Calculate progress based on the audio timeline (from 10% to 90% of bar)
                real_progress = 10 + int((segment.end / total_duration) * 80)
                
                # Update frontend with actual transcription snippet
                on_progress(
                    file_id, 
                    "transcribing", 
                    real_progress, 
                    f"Transcribing: {segment.text.strip()[:30]}..."
                )

                start = self.format_timestamp(segment.start)
                end = self.format_timestamp(segment.end)
                text = segment.text.strip()
                
                if text:
                    srt_blocks.append(f"{len(srt_blocks) + 1}\n{start} --> {end}\n{text}\n")

            on_progress(file_id, "transcribing", 95, "Finalizing subtitles...")
            logger.info(f"✅ Transcription complete. Generated {len(srt_blocks)} segments.")
            
            return "\n".join(srt_blocks)

        except Exception as e:
            logger.error(f"❌ Transcription error: {str(e)}")
            raise e
        finally:
            if audio_file and os.path.exists(audio_file):
                try:
                    os.remove(audio_file)
                except Exception:
                    pass