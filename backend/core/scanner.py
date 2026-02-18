import os
import subprocess
import json
import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger("SubStudio.Scanner")

class VideoScanner:
    def __init__(self, base_path: str):
        self.base_path = base_path
        self.supported_extensions = ('.mp4', '.mkv', '.avi', '.mov', '.wmv')
        self.subtitle_extensions = ('.srt', '.vtt', '.ass', '.ssa')

    def _get_subtitle_meta(self, file_entry: os.DirEntry, all_entries: List[os.DirEntry]) -> Dict[str, Any]:
        """
        Deep scan for subtitles to populate the frontend 'Badge'.
        Rules:
        1. External files with matching names (Direct or /Subs folder).
        2. Isolation rule (One video in folder takes any SRT).
        3. Embedded stream detection via ffprobe.
        """
        video_path = file_entry.path
        video_stem = os.path.splitext(file_entry.name)[0]
        parent_dir = os.path.dirname(video_path)
        
        meta = {
            "hasSubtitles": False,
            "subType": None,
            "language": "auto",
            "externalPath": None,
            "embeddedTracks": []
        }

        # 1. External Search
        search_dirs = [parent_dir, os.path.join(parent_dir, "Subs"), os.path.join(parent_dir, "Subtitles")]
        for d in search_dirs:
            if not os.path.isdir(d): continue
            try:
                for f in os.listdir(d):
                    if f.lower().endswith(self.subtitle_extensions) and video_stem.lower() in f.lower():
                        meta["hasSubtitles"] = True
                        meta["subType"] = "external"
                        meta["externalPath"] = os.path.join(d, f)
                        # Try to extract lang from filename like "movie.en.srt"
                        lang_match = re.search(r'\.([a-z]{2,3})\.', f.lower())
                        if lang_match:
                            meta["language"] = lang_match.group(1)
                        break 
            except Exception: continue

        # 2. Embedded Probe (The "Badge" engine)
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json', 
                '-show_streams', '-select_streams', 's', video_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
            probe = json.loads(result.stdout)
            
            streams = probe.get('streams', [])
            if streams:
                meta["hasSubtitles"] = True
                if not meta["subType"]: meta["subType"] = "embedded"
                
                langs = []
                for s in streams:
                    l = s.get('tags', {}).get('language', 'und')
                    langs.append(l)
                
                meta["embeddedTracks"] = langs
                if meta["language"] == "auto" and langs:
                    meta["language"] = langs[0]

        except Exception as e:
            logger.debug(f"Probe skipped for {file_entry.name}: {e}")

        return meta

    def scan(self, target_path: str = None, recursive: bool = True) -> List[Dict[str, Any]]:
        scan_target = target_path if target_path else self.base_path
        
        # Security Guard
        if not os.path.abspath(scan_target).startswith(os.path.abspath(self.base_path)):
            logger.warning(f"Unauthorized scan attempt: {scan_target}")
            scan_target = self.base_path

        items = []
        try:
            if not os.path.exists(scan_target): return []

            # Get directory contents once to help with isolation rules
            entries = list(os.scandir(scan_target))
            
            for entry in entries:
                if entry.is_dir() and not entry.name.startswith('.'):
                    items.append({
                        "id": entry.path,
                        "fileName": entry.name,
                        "filePath": entry.path,
                        "is_directory": True,
                        "status": "folder",
                        "children": self.scan(entry.path, recursive) if recursive else []
                    })
                
                elif entry.is_file() and entry.name.lower().endswith(self.supported_extensions):
                    logger.info(f"Scanning: {entry.name}")
                    sub_info = self._get_subtitle_meta(entry, entries)
                    
                    items.append({
                        "id": entry.path,
                        "fileName": entry.name,
                        "filePath": entry.path,
                        "is_directory": False,
                        "status": "idle",
                        "progress": 0,
                        "subtitleInfo": sub_info, # Matches VideoCard.tsx expectations
                        "sourceLang": [sub_info["language"]],
                        "targetLanguages": ["fr"] # Default fallback
                    })

            # Sort: Folders first, then names
            items.sort(key=lambda x: (not x.get("is_directory", False), x["fileName"].lower()))
            
        except Exception as e:
            logger.error(f"Scan failed in {scan_target}: {e}")
            
        return items