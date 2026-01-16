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
        Detects subtitles using four rules:
        1. Same-name in same folder.
        2. Same-name in 'Subs' or 'Subtitles' subfolder.
        3. Isolation rule (single video in folder takes any SRT).
        4. Embedded tracks via ffprobe.
        """
        video_path = file_entry.path
        video_name_stem = os.path.splitext(file_entry.name)[0]
        parent_dir = os.path.dirname(video_path)
        
        found_subs = False
        sub_type = None
        languages = []
        found_files = [] 
        srt_path = "None" # Default for frontend

        # 1. & 2. Search for external SRT files (Direct or in Subfolders)
        search_dirs = [
            parent_dir, 
            os.path.join(parent_dir, "Subs"), 
            os.path.join(parent_dir, "Subtitles")
        ]
        
        for d in search_dirs:
            if not os.path.exists(d): 
                continue
            
            try:
                for f in os.listdir(d):
                    # Check if file starts with video name and has sub extension
                    if f.lower().endswith(self.subtitle_extensions) and f.lower().startswith(video_name_stem.lower()):
                        found_subs = True
                        sub_type = "external"
                        full_srt_path = os.path.abspath(os.path.join(d, f))
                        
                        if f not in found_files:
                            found_files.append(f)
                        
                        # Set the primary srtPath for the frontend execution payload
                        if srt_path == "None":
                            srt_path = full_srt_path
                        
                        # Extract language tags (e.g., .en.srt)
                        lang_match = re.search(r'[\._\-]([a-z]{2,3})[\._\-]', f.lower())
                        if lang_match:
                            lang = lang_match.group(1)
                            if lang not in languages:
                                languages.append(lang)
            except OSError:
                continue

        # 3. Isolation Rule: If no same-name subs, check if this is the only video in the folder
        if not found_subs:
            videos_in_dir = [e for e in all_entries if e.is_file() and e.name.lower().endswith(self.supported_extensions)]
            if len(videos_in_dir) == 1:
                try:
                    all_files = os.listdir(parent_dir)
                    loose_subs = [f for f in all_files if f.lower().endswith(self.subtitle_extensions)]
                    if loose_subs:
                        found_subs = True
                        sub_type = "external_isolated"
                        found_files.extend(loose_subs)
                        srt_path = os.path.abspath(os.path.join(parent_dir, loose_subs[0]))
                except OSError:
                    pass

        # 4. Embedded detection via ffprobe
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json', 
                '-show_streams', '-select_streams', 's', video_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            probe_data = json.loads(result.stdout)
            
            embedded_tracks = probe_data.get('streams', [])
            if embedded_tracks:
                found_subs = True
                # Only set subType to embedded if we haven't found an external file yet
                if not sub_type: 
                    sub_type = "embedded"
                    srt_path = "Embedded"
                
                for stream in embedded_tracks:
                    lang = stream.get('tags', {}).get('language')
                    if lang and lang not in languages:
                        languages.append(lang)
        except Exception as e:
            # We don't want to crash the scanner if ffprobe fails
            print(f"FFprobe error on {video_name_stem}: {e}")

        # Final Cleanup: Language formatting
        if found_subs and not languages:
            languages = ["auto"]

        return {
            "hasSubtitles": found_subs,
            "subType": sub_type,
            "languages": languages,
            "foundFiles": found_files, 
            "srtPath": srt_path,  # Explicit path for frontend tooltip/payload
            "count": len(languages) if languages != ["auto"] else 1
        }

    def scan(self, target_path: str = None, recursive: bool = True) -> List[Dict]:
        path_to_scan = target_path if target_path else self.base_path
        
        # Security: Ensure scanning stays within base path
        abs_base = os.path.abspath(self.base_path)
        abs_target = os.path.abspath(path_to_scan)
        if not abs_target.startswith(abs_base):
            path_to_scan = self.base_path

        items = []
        
        try:
            if not os.path.exists(path_to_scan):
                return []

            # Capture entries to pass to the isolation rule
            with os.scandir(path_to_scan) as entries:
                entry_list = list(entries)
            
            for entry in entry_list:
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
                    # Process the video file
                    sub_info = self._get_subtitle_info(entry, entry_list)
                    
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
            
            # Sort: Directories first, then alphabetical
            items.sort(key=lambda x: (not x['is_directory'], x['fileName'].lower()))
            
        except Exception as e:
            print(f"Error scanning {path_to_scan}: {e}")
            
        return items