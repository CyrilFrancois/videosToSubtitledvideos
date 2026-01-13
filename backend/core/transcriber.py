import os
import whisper
import ffmpeg
from pathlib import Path
from typing import Callable

class VideoTranscriber:
    def __init__(self, model_size: str = "base"):
        # Models: tiny, base, small, medium, large
        print(f"Loading Whisper model: {model_size}...")
        self.model = whisper.load_model(model_size)

    def extract_audio(self, video_path: str) -> str:
        """Extracts audio to a temporary wav file for better AI accuracy."""
        audio_path = video_path.rsplit('.', 1)[0] + ".temp.wav"
        try:
            (
                ffmpeg
                .input(video_path)
                .output(audio_path, acodec='pcm_s16le', ac=1, ar='16k')
                .overwrite_output()
                .run(quiet=True)
            )
            return audio_path
        except Exception as e:
            print(f"FFmpeg audio extraction failed: {e}")
            return video_path # Fallback to original (Whisper can handle some video containers)

    def format_timestamp(self, seconds: float) -> str:
        """Converts seconds to SRT timestamp format: HH:MM:SS,mmm"""
        tdelta = str(seconds).split('.')
        secs = int(tdelta[0])
        milli = int(tdelta[1][:3]) if len(tdelta) > 1 else 0
        
        hours = secs // 3600
        minutes = (secs % 3600) // 60
        seconds = secs % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milli:03d}"

    def transcribe(self, video_path: str, file_id: str, on_progress: Callable):
        """Runs the transcription and yields SRT content."""
        audio_file = self.extract_audio(video_path)
        
        on_progress(file_id, "transcribing", 10, "AI is listening...")
        
        # Transcribe with timestamps
        result = self.model.transcribe(
            audio_file, 
            verbose=False,
            fp16=False # Set to True if using NVIDIA GPU
        )

        srt_content = ""
        segments = result.get('segments', [])
        total_segments = len(segments)

        for i, segment in enumerate(segments):
            start = self.format_timestamp(segment['start'])
            end = self.format_timestamp(segment['end'])
            text = segment['text'].strip()
            
            srt_content += f"{i + 1}\n{start} --> {end}\n{text}\n\n"
            
            # Update progress based on processed segments (scaled 20% to 90%)
            progress_val = 20 + int((i / total_segments) * 70)
            if i % 5 == 0: # Reduce network spam
                on_progress(file_id, "transcribing", progress_val, f"Transcribing: {text[:20]}...")

        # Cleanup temp audio
        if audio_file.endswith(".temp.wav") and os.path.exists(audio_file):
            os.remove(audio_file)

        on_progress(file_id, "transcribing", 100, "Transcription complete!")
        return srt_content