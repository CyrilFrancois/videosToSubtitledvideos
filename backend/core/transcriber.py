import os
import logging
import ffmpeg
import gc
from faster_whisper import WhisperModel
from typing import Callable, Optional
from pathlib import Path

logger = logging.getLogger("SubStudio.Transcriber")

class VideoTranscriber:
    def __init__(self, model_size: str = "base"):
        """
        Initializes the state. 
        The actual model is NOT loaded here to prevent pinning RAM at boot.
        """
        self.model = None
        self.current_model_size = None
        self.default_model_size = model_size

    def _get_model(self, model_size: str):
        """
        Ensures the correct model is in memory.
        If a different model is already loaded, it clears it first.
        """
        if self.model is None or self.current_model_size != model_size:
            if self.model is not None:
                logger.warning(f"Model mismatch. Clearing [{self.current_model_size}] to load [{model_size}]...")
                self.model = None
                gc.collect()  # Force RAM release
            
            logger.info(f"LOADING WHISPER MODEL: [{model_size}] (Device: CPU, Compute: int8)")
            self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
            self.current_model_size = model_size
        else:
            logger.info(f"💎 Model [{self.current_model_size}] already in RAM. Reusing for next file.")
        
        return self.model

    def extract_audio(self, video_path: str) -> str:
        audio_path = str(Path(video_path).with_suffix(".tmp.wav"))
        logger.info(f"Extracting audio for analysis...")
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
        total_files: int,
        model_size: Optional[str] = None,
        context_prompt: Optional[str] = None
    ) -> str:
        audio_file = ""
        file_prefix = f"[{current_file}/{total_files} Files]"
        
        # Use provided model size or fall back to class default
        target_size = model_size or self.default_model_size

        try:
            # 1. Prepare Audio
            on_progress(file_id, "transcribing", 5, f"{file_prefix} Step 2/5: Extracting audio...")
            audio_file = self.extract_audio(video_path)
            
            if not audio_file or not os.path.exists(audio_file):
                raise Exception("Could not prepare audio for transcription.")

            # 2. Get/Load Model (Caching logic)
            whisper = self._get_model(target_size)

            # 3. Context Logging
            if context_prompt:
                logger.info(f"CONTEXT BIASING: Providing initial prompt ({len(context_prompt)} chars)")
                # logger.debug(f"Prompt content: {context_prompt}")
            else:
                logger.warning("⚠️ No context profile provided for this transcription.")

            # 4. AI Inference
            logger.info(f"Faster-Whisper inference starting on [{target_size}]...")
            segments, info = whisper.transcribe(
                audio_file, 
                beam_size=5, 
                word_timestamps=True,
                initial_prompt=context_prompt, # Injecting your "Thor/Viking" context here
                condition_on_previous_text=False
            )
            
            total_duration = info.duration
            srt_blocks = []
            last_logged_pct = -1

            for segment in segments:
                progress_val = 10 + int((segment.end / total_duration) * 80)
                on_progress(
                    file_id, 
                    "transcribing", 
                    progress_val, 
                    f"{file_prefix} Step 2/5: AI Transcribing ({int((segment.end / total_duration) * 100)}%)"
                )

                # Terminal log every 10%
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
            return "\n".join(srt_blocks)

        except Exception as e:
            logger.error(f"❌ {file_prefix} Transcription error: {str(e)}")
            raise e
        finally:
            if audio_file and os.path.exists(audio_file):
                try:
                    os.remove(audio_file)
                    logger.info(f"Cleaned up temporary audio: {os.path.basename(audio_file)}")
                except:
                    pass