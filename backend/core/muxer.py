import os
import re
import logging
import subprocess
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger("SubStudio.Muxer")

class VideoMuxer:
    def __init__(self):
        # ISO 639-2 map for MKV metadata compatibility
        self.lang_map = {
            "fr": "fra", "en": "eng", "es": "spa", "de": "deu",
            "it": "ita", "pt": "por", "nl": "nld", "ja": "jpn",
            "ko": "kor", "zh": "zho", "ru": "rus"
        }

    def get_video_duration(self, video_path: Path) -> float:
        """Returns the duration of the video in seconds using ffprobe."""
        try:
            cmd = [
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", str(video_path)
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return float(result.stdout.strip())
        except Exception as e:
            logger.warning(f"Could not determine video duration: {e}. Defaulting to large value.")
            return 999999.0

    def srt_time_to_seconds(self, time_str: str) -> float:
        """Converts SRT timestamp (00:00:00,000) to total seconds."""
        h, m, s_ms = time_str.split(':')
        s, ms = s_ms.split(',')
        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000

    def process_srt_content(self, srt_text: str, max_duration: float, max_chars: int = 60) -> str:
        """
        1. Splits long lines with \n (Python 3.10 compatible).
        2. Removes subtitle blocks that start after the video duration.
        """
        processed_blocks = []
        # Pattern for SRT blocks: Index, TimeRange, Content
        pattern = re.compile(r"(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?:\n\n|\Z)")
        
        matches = pattern.finditer(srt_text)
        
        for match in matches:
            index, start_time_str, end_time_str, text = match.groups()
            
            # Check if subtitle starts after video ends to prevent black screen issues
            start_seconds = self.srt_time_to_seconds(start_time_str)
            if start_seconds >= max_duration:
                continue 

            # Split long lines logic
            lines = text.strip().split('\n')
            new_lines = []
            for line in lines:
                if len(line) > max_chars:
                    mid = len(line) // 2
                    space_indices = [i for i, char in enumerate(line) if char == ' ']
                    if space_indices:
                        best_space = min(space_indices, key=lambda x: abs(x - mid))
                        line = line[:best_space] + '\n' + line[best_space+1:]
                new_lines.append(line)
            
            # Fix for Python < 3.12: Join outside the f-string to avoid backslash error
            clean_text = '\n'.join(new_lines)
            processed_blocks.append(f"{index}\n{start_time_str} --> {end_time_str}\n{clean_text}")

        # Join blocks with double newlines and ensure a trailing newline
        return "\n\n".join(processed_blocks) + "\n\n"

    def get_existing_sub_count(self, video_path: Path) -> int:
        """Counts existing subtitle streams in the source file for correct metadata indexing."""
        try:
            cmd = [
                "ffprobe", "-v", "error", "-select_streams", "s",
                "-show_entries", "stream=index", "-of", "csv=p=0", str(video_path)
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            output = result.stdout.strip()
            return len(output.split('\n')) if output else 0
        except:
            return 0

    def mux(
        self,
        video_path: str,
        srts: Dict[str, str],
        current_file: int,
        total_files: int,
        strip_existing: bool = False,
        cleanup_original: bool = False
    ) -> str:
        video_input_path = Path(video_path)
        output_path = video_input_path.parent / f"{video_input_path.stem}_SubStudio.mkv"
        prefix = f"[{current_file}/{total_files} Files]"
        
        # Determine duration to clip trailing subs and count existing tracks for metadata
        video_duration = self.get_video_duration(video_input_path)
        existing_sub_count = 0 if strip_existing else self.get_existing_sub_count(video_input_path)

        tmp_srt_paths: List[tuple] = []

        # ------------------------------------------------
        # 1. Process and Write temporary SRT files
        # ------------------------------------------------
        for lang_code, content in srts.items():
            formatted_content = self.process_srt_content(content, video_duration)
            
            tmp_path = video_input_path.parent / f"{video_input_path.stem}.{lang_code}.tmp.srt"
            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(formatted_content)
            tmp_srt_paths.append((lang_code, tmp_path))

        try:
            logger.info(f"{prefix} Muxing: {video_input_path.name}")

            # ------------------------------------------------
            # 2. Build FFmpeg command
            # ------------------------------------------------
            cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
            cmd += ["-i", str(video_input_path)]
            for _, srt_path in tmp_srt_paths:
                cmd += ["-i", str(srt_path)]

            # Mapping Logic
            if strip_existing:
                cmd += ["-map", "0:v", "-map", "0:a"]
            else:
                cmd += ["-map", "0"]

            for i in range(len(tmp_srt_paths)):
                cmd += ["-map", f"{i + 1}:0"]

            # Codecs: Copy video/audio, encode subs to srt/text for MKV
            cmd += ["-c:v", "copy", "-c:a", "copy", "-c:s", "srt"]

            # Metadata Assignment
            for index, (lang_code, _) in enumerate(tmp_srt_paths):
                # Calculate the correct output stream index for subtitles
                out_stream_idx = existing_sub_count + index
                iso_lang = self.lang_map.get(lang_code.lower(), lang_code.lower())
                cmd += [f"-metadata:s:s:{out_stream_idx}", f"language={iso_lang}"]
                cmd += [f"-metadata:s:s:{out_stream_idx}", f"title=AI {lang_code.upper()}"]

            cmd += [str(output_path)]

            # Execute FFmpeg
            process = subprocess.run(cmd, capture_output=True, text=True)
            if process.returncode != 0:
                raise RuntimeError(process.stderr)

            # Cleanup Temporary SRTs
            for _, p in tmp_srt_paths:
                if p.exists(): p.unlink()

            # Cleanup Original if requested
            if cleanup_original:
                if output_path.exists() and video_input_path.resolve() != output_path.resolve():
                    logger.info(f"{prefix} Cleanup: Removing source file.")
                    video_input_path.unlink()

            return str(output_path)

        except Exception as e:
            # Emergency Cleanup
            for _, p in tmp_srt_paths:
                if p.exists(): p.unlink()
            logger.error(f"❌ {prefix} Muxing Error: {str(e)}")
            raise Exception(f"Muxing failed: {str(e)}")