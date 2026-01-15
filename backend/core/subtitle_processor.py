import os
import subprocess
import json

class SubtitleProcessor:
    def __init__(self):
        pass

    def load_existing_subtitles(self, video_info: dict) -> str:
        """
        Loads content from a sidecar .srt file or extracts from embedded track.
        """
        sub_info = video_info.get('subtitleInfo', {})
        file_path = video_info.get('filePath')

        # Scenario 1: External SRT file found
        if sub_info.get('subType') == 'external' and sub_info.get('hasSubtitles'):
            # We assume the scanner found a matching .srt
            srt_path = os.path.splitext(file_path)[0] + ".srt"
            if os.path.exists(srt_path):
                with open(srt_path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read()

        # Scenario 2: Embedded Track
        if sub_info.get('subType') == 'embedded':
            return self.extract_embedded_subs(file_path)

        return ""

    def extract_embedded_subs(self, video_path: str, track_index: int = 0) -> str:
        """
        Uses FFmpeg to extract an internal subtitle track to string.
        """
        try:
            # Command to output SRT to stdout
            cmd = [
                'ffmpeg', '-i', video_path,
                '-map', f'0:s:{track_index}',
                '-f', 'srt', '-'
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return result.stdout
        except Exception as e:
            print(f"Extraction error: {e}")
            return ""