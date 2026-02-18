import os
import subprocess
import logging
import re
from datetime import timedelta
from typing import Any, Optional

logger = logging.getLogger("SubStudio.Processor")

class SubtitleProcessor:
    def __init__(self):
        # Regex for SRT timestamps: 00:00:20,000 --> 00:00:24,400
        self.timestamp_regex = re.compile(r'(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})')

    def apply_offset(self, srt_content: str, offset_seconds: float) -> str:
        """
        Calculates and applies the temporal shift to every subtitle block.
        Offset can be positive or negative.
        """
        if offset_seconds == 0:
            return srt_content

        logger.info(f"⏱️ Adjusting timing by {offset_seconds}s")
        
        def shift_timestamp(match):
            start_val = self._add_offset(match.group(1), offset_seconds)
            end_val = self._add_offset(match.group(2), offset_seconds)
            return f"{start_val} --> {end_val}"

        return self.timestamp_regex.sub(shift_timestamp, srt_content)

    def _add_offset(self, timestamp_str: str, offset_sec: float) -> str:
        """Helper to convert SRT string to delta, add offset, and convert back."""
        try:
            # Parse SRT format: HH:MM:SS,mmm
            h, m, s_ms = timestamp_str.split(':')
            s, ms = s_ms.split(',')
            
            td = timedelta(
                hours=int(h), 
                minutes=int(m), 
                seconds=int(s), 
                milliseconds=int(ms)
            )
            
            # Apply offset
            new_td = td + timedelta(seconds=offset_sec)
            
            # Prevent negative timestamps (clamp to 0)
            if new_td.total_seconds() < 0:
                new_td = timedelta(0)
            
            # Format back to SRT
            total_seconds = int(new_td.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            milliseconds = int(new_td.microseconds / 1000)
            
            return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"
        except Exception as e:
            logger.error(f"Timestamp shift error: {e}")
            return timestamp_str

    def load_existing_subtitles(self, video_info: dict, task_manager: Any) -> str:
        """Loads from sidecar or extracts via ffmpeg."""
        sub_info = video_info.get('subtitleInfo', {})
        file_path = video_info.get('filePath')

        # External SRT
        if sub_info.get('subType') == 'external':
            path = sub_info.get('externalPath') or (os.path.splitext(file_path)[0] + ".srt")
            if os.path.exists(path):
                logger.info(f"📄 Reading external SRT: {os.path.basename(path)}")
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read()

        # Embedded Track
        if sub_info.get('subType') == 'embedded':
            return self.extract_embedded_subs(file_path, task_manager)

        return ""

    def extract_embedded_subs(self, video_path: str, task_manager: Any, track_index: int = 0) -> str:
        """Extracts an internal subtitle stream to a string using ffmpeg."""
        temp_srt = f"{os.path.splitext(video_path)[0]}.tmp_extract.srt"
        
        cmd = [
            'ffmpeg', '-y', '-i', video_path,
            '-map', f'0:s:{track_index}',
            '-f', 'srt', temp_srt
        ]

        try:
            logger.info(f"⚙️ Extracting embedded track {track_index}...")
            process = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            )
            task_manager.active_pid = process.pid
            process.communicate()
            task_manager.active_pid = None

            if os.path.exists(temp_srt):
                with open(temp_srt, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                os.remove(temp_srt)
                return content
        except Exception as e:
            logger.error(f"Extraction failed: {e}")
            
        return ""