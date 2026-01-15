import os
from typing import List, Dict

class VideoScanner:
    def __init__(self, base_path: str):
        self.base_path = base_path
        self.supported_extensions = ('.mp4', '.mkv', '.avi', '.mov')

    def scan(self, target_path: str = None, recursive: bool = True) -> List[Dict]:
        """
        Scans a directory for video files and subdirectories.
        If recursive is True, it builds a full nested tree structure.
        """
        # Default to base_path if none provided
        path_to_scan = target_path if target_path else self.base_path
        
        # Security: Prevent escaping the data directory
        if not path_to_scan.startswith(self.base_path):
            path_to_scan = self.base_path

        items = []
        
        try:
            if not os.path.exists(path_to_scan):
                return []

            # Get directory contents
            for entry in os.scandir(path_to_scan):
                # 1. Handle Subdirectories
                if entry.is_dir():
                    folder_data = {
                        "id": entry.path,
                        "fileName": entry.name,
                        "filePath": entry.path,
                        "is_directory": True,
                        "status": "folder",
                        "children": [] # Initialize children list
                    }
                    
                    # RECURSIVE STEP: If recursive is enabled, scan this folder too
                    if recursive:
                        folder_data["children"] = self.scan(entry.path, recursive=True)
                    
                    items.append(folder_data)
                
                # 2. Handle Video Files
                elif entry.is_file() and entry.name.lower().endswith(self.supported_extensions):
                    items.append({
                        "id": entry.path,
                        "fileName": entry.name,
                        "filePath": entry.path,
                        "extension": entry.name.split('.')[-1],
                        "is_directory": False,
                        "status": "idle",
                        "progress": 0
                    })
            
            # Sort: Folders first, then files alphabetically
            items.sort(key=lambda x: (not x['is_directory'], x['fileName'].lower()))
            
        except Exception as e:
            print(f"Error scanning {path_to_scan}: {e}")
            
        return items