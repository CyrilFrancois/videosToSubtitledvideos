import os
import subprocess
import json
import re
from typing import List, Dict

class VideoScanner:
    def __init__(self, base_path: str):
        self.base_path = base_path
        self.supported_extensions = ('.mp4', '.mkv', '.avi', '.mov')
        self.subtitle_extensions = ('.srt', '.vtt', '.ass')

    def _get_subtitle_info(self, file_entry: os.DirEntry, all_entries: List[os.DirEntry]) -> Dict:
        """
        Implements the 4 detection rules: Same-name, Subfolder, Isolation, and Embedded.
        Now tracks specific filenames for the frontend tooltip.
        """
        video_path = file_entry.path
        video_name_stem = os.path.splitext(file_entry.name)[0]
        parent_dir = os.path.dirname(video_path)
        
        found_subs = False
        sub_type = None
        languages = []
        found_files = [] # New list to store actual filenames

        # 1. & 2. Same-name detection (Same folder or 'Subs' subfolder)
        search_dirs = [
            parent_dir, 
            os.path.join(parent_dir, "Subs"), 
            os.path.join(parent_dir, "Subtitles")
        ]
        
        for d in search_dirs:
            if not os.path.exists(d): continue
            
            for f in os.listdir(d):
                if f.lower().endswith(self.subtitle_extensions) and f.lower().startswith(video_name_stem.lower()):
                    found_subs = True
                    sub_type = "external"
                    if f not in found_files:
                        found_files.append(f)
                    
                    # Regex to catch language tags like .en.srt or _eng.srt
                    lang_match = re.search(r'[\._\-]([a-z]{2,3})[\._\-]', f.lower())
                    if lang_match:
                        lang = lang_match.group(1)
                        if lang not in languages:
                            languages.append(lang)

        # 3. Isolation Rule: Only one movie in folder? Take any SRT found there.
        if not found_subs:
            videos_in_dir = [e for e in all_entries if e.is_file() and e.name.lower().endswith(self.supported_extensions)]
            if len(videos_in_dir) == 1:
                all_files = os.listdir(parent_dir)
                loose_subs = [f for f in all_files if f.lower().endswith(self.subtitle_extensions)]
                if loose_subs:
                    found_subs = True
                    sub_type = "external_isolated"
                    found_files.extend(loose_subs)

        # 4. Embedded detection via ffprobe
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json', 
                '-show_streams', '-select_streams', 's', video_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            probe_data = json.loads(result.stdout)
            
            embedded_tracks = probe_data.get('streams', [])
            if embedded_tracks:
                found_subs = True
                if not sub_type: sub_type = "embedded"
                for stream in embedded_tracks:
                    lang = stream.get('tags', {}).get('language')
                    if lang and lang not in languages:
                        languages.append(lang)
        except Exception as e:
            print(f"FFprobe error on {video_name_stem}: {e}")

        # Final Fallback: If found but no language, mark as auto
        if found_subs and not languages:
            languages = ["auto"]

        return {
            "hasSubtitles": found_subs,
            "subType": sub_type,
            "languages": languages,
            "foundFiles": found_files, # Returned to frontend for tooltip
            "count": len(languages) if languages != ["auto"] else 1
        }

    def scan(self, target_path: str = None, recursive: bool = True) -> List[Dict]:
        path_to_scan = target_path if target_path else self.base_path
        
        # Security check: Ensure scanning stays within base path
        if not os.path.abspath(path_to_scan).startswith(os.path.abspath(self.base_path)):
            path_to_scan = self.base_path

        items = []
        
        try:
            if not os.path.exists(path_to_scan):
                return []

            # Pre-list entries for the Isolation Rule logic
            entries = list(os.scandir(path_to_scan))
            
            for entry in entries:
                if entry.is_dir():
                    folder_data = {
                        "id": entry.path,
                        "fileName": entry.name,
                        "filePath": entry.path,
                        "is_directory": True,
                        "status": "folder",
                        "children": []
                    }
                    if recursive:
                        folder_data["children"] = self.scan(entry.path, recursive=True)
                    items.append(folder_data)
                
                elif entry.is_file() and entry.name.lower().endswith(self.supported_extensions):
                    # Fetch detailed subtitle metadata
                    sub_info = self._get_subtitle_info(entry, entries)
                    
                    items.append({
                        "id": entry.path,
                        "fileName": entry.name,
                        "filePath": entry.path,
                        "extension": entry.name.split('.')[-1],
                        "is_directory": False,
                        "status": "idle",
                        "progress": 0,
                        "subtitleInfo": sub_info,
                        "has_matching_srt": sub_info["hasSubtitles"] 
                    })
            
            # Sort: Directories first, then alphabetically
            items.sort(key=lambda x: (not x['is_directory'], x['fileName'].lower()))
            
        except Exception as e:
            print(f"Error scanning {path_to_scan}: {e}")
            
        return items