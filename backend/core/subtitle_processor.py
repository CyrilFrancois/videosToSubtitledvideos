import os
import subprocess
import logging
from typing import Any, Optional

logger = logging.getLogger("SubStudio.Processor")

class SubtitleProcessor:
    def __init__(self):
        pass

    def load_existing_subtitles(self, video_info: dict, task_manager: Any) -> str:
        """
        Loads content from a sidecar .srt file or extracts from embedded track.
        Passes task_manager to track PIDs during extraction.
        """
        sub_info = video_info.get('subtitleInfo', {})
        file_path = video_info.get('filePath')
        file_name = video_info.get('fileName', 'Unknown File')

        # Scenario 1: External SRT file found
        if sub_info.get('subType') == 'external' and sub_info.get('hasSubtitles'):
            srt_path = sub_info.get('srtPath') or (os.path.splitext(file_path)[0] + ".srt")
            
            if os.path.exists(srt_path):
                logger.info(f"📄 [PROCESSOR] Reading external SRT: {os.path.basename(srt_path)}")
                try:
                    with open(srt_path, 'r', encoding='utf-8', errors='ignore') as f:
                        return f.read()
                except Exception as e:
                    logger.error(f"❌ [PROCESSOR] Failed to read external SRT: {e}")

        # Scenario 2: Embedded Track
        if sub_info.get('subType') == 'embedded':
            logger.info(f"📦 [PROCESSOR] Extracting embedded track from {file_name}")
            return self.extract_embedded_subs(file_path, task_manager)

        return ""

    def extract_embedded_subs(self, video_path: str, task_manager: Any, track_index: int = 0) -> str:
        """
        Uses FFmpeg to extract an internal subtitle track.
        Uses Popen to allow the TaskManager to kill the extraction if needed.
        """
        # Define a temporary file for extraction to avoid memory issues with huge logs
        temp_srt = video_path.rsplit('.', 1)[0] + ".extracted.tmp.srt"
        task_manager.register_artifact(temp_srt)

        cmd = [
            'ffmpeg', '-y', '-i', video_path,
            '-map', f'0:s:{track_index}',
            '-f', 'srt', temp_srt
        ]

        try:
            logger.info(f"⚙️ [FFMPEG] Extracting track index {track_index}...")
            
            # Start process async
            process = subprocess.Popen(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE, 
                text=True
            )

            # Link PID to TaskManager for Kill Switch
            task_manager.active_pid = process.pid
            
            # Wait for completion
            stdout, stderr = process.communicate()
            
            # Reset PID
            task_manager.active_pid = None

            if process.returncode != 0:
                logger.error(f"❌ [FFMPEG] Extraction failed: {stderr}")
                return ""

            # Read the result
            if os.path.exists(temp_srt):
                with open(temp_srt, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Cleanup immediate artifact (optional, TaskManager will catch it anyway)
                os.remove(temp_srt)
                logger.info(f"✅ [PROCESSOR] Successfully extracted {len(content.splitlines())} lines.")
                return content

        except Exception as e:
            logger.error(f"❌ [PROCESSOR] Extraction error: {e}")
            task_manager.active_pid = None
            
        return ""