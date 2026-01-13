import os
import json
import subprocess
import uuid
from pathlib import Path

class VideoScanner:
    def __init__(self, base_path: str):
        self.base_path = base_path
        self.video_extensions = {'.mp4', '.mkv', '.avi', '.mov'}

    def get_video_metadata(self, file_path: str):
        """Uses ffprobe to extract audio and subtitle tracks from inside the file."""
        cmd = [
            'ffprobe', '-v', 'quiet', 
            '-print_format', 'json', 
            '-show_format', '-show_streams', 
            file_path
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            data = json.loads(result.stdout)
            
            audio_streams = []
            internal_subs = []
            
            for stream in data.get('streams', []):
                s_type = stream.get('codec_type')
                lang = stream.get('tags', {}).get('language', 'und')
                
                if s_type == 'audio':
                    audio_streams.append({
                        "id": str(stream.get('index')),
                        "language": lang,
                        "title": stream.get('tags', {}).get('title', f"Audio {lang}")
                    })
                elif s_type == 'subtitle':
                    internal_subs.append({
                        "id": str(stream.get('index')),
                        "language": lang,
                        "isExternal": False,
                        "isSdh": "sdh" in stream.get('tags', {}).get('title', '').lower()
                    })
            
            return audio_streams, internal_subs
        except Exception as e:
            print(f"Error probing {file_path}: {e}")
            return [], []

    def find_external_subtitles(self, video_path: Path):
        """
        Implementation of your complex discovery UX:
        1. Same folder (sidecar)
        2. /subs/ or /subtitles/ subfolder
        3. /subs/video_name/ subfolder
        """
        external_subs = []
        video_name = video_path.stem
        parent_dir = video_path.parent

        # List of potential directories to check
        search_dirs = [
            parent_dir,                                 # Same folder
            parent_dir / "subs",                        # /subs/
            parent_dir / "subtitles",                   # /subtitles/
            parent_dir / "subs" / video_name,           # /subs/video_name/
            parent_dir / "subtitles" / video_name        # /subtitles/video_name/
        ]

        for s_dir in search_dirs:
            if s_dir.exists() and s_dir.is_dir():
                for file in s_dir.iterdir():
                    if file.suffix == '.srt' and (video_name in file.name or s_dir.name == video_name):
                        size = file.stat().st_size
                        external_subs.append({
                            "id": str(uuid.uuid4()),
                            "language": "und", # Ideally parsed from filename like 'en.srt'
                            "isExternal": True,
                            "path": str(file),
                            "fileSize": size,
                            "isSdh": size > 50000 # Heuristic: larger files usually contain SDH/Ambient noise
                        })
        
        # Sort by size descending so the "heaviest" is first in the list
        external_subs.sort(key=lambda x: x['fileSize'], reverse=True)
        return external_subs

    def scan(self, recursive: bool = True):
        video_files = []
        search_path = Path(self.base_path)
        
        pattern = "**/*" if recursive else "*"
        
        for path in search_path.glob(pattern):
            if path.suffix.lower() in self.video_extensions:
                audio, internal = self.get_video_metadata(str(path))
                external = self.find_external_subtitles(path)
                
                video_files.append({
                    "id": str(uuid.uuid4()),
                    "fileName": path.name,
                    "filePath": str(path),
                    "extension": path.suffix.replace('.', ''),
                    "audioStreams": audio,
                    "internalSubtitles": internal,
                    "externalSubtitles": external,
                    "status": "idle",
                    "progress": 0,
                    "outputLanguages": ["fr"], # Default selection
                    "shouldMux": True,
                    "shouldRemoveOriginal": false
                })
        
        return video_files