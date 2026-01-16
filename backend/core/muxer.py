import ffmpeg
import os
import logging
from pathlib import Path
from typing import Callable, Any, Dict

logger = logging.getLogger("SubStudio.Muxer")

class VideoMuxer:
    def __init__(self):
        # Mapping for common languages to ISO-639-2 (required by MKV/FFmpeg)
        self.lang_map = {
            'fr': 'fra',
            'en': 'eng',
            'es': 'spa',
            'de': 'deu',
            'it': 'ita',
            'pt': 'por',
            'nl': 'nld'
        }

    def mux(
        self, 
        video_path: str, 
        translated_srts: Dict[str, str], 
        file_id: str, 
        on_progress: Callable,
        task_manager: Any,
        cleanup_original: bool = False
    ) -> str:
        """
        Muxes translated SRTs into an MKV.
        Naming logic: 
        - Always creates a new .mkv.
        - If cleanup_original is False, adds '_SubStudio' suffix.
        """
        video_input_path = Path(video_path)
        
        # 1. Determine Output Filename
        if not cleanup_original:
            output_path = str(video_input_path.parent / f"{video_input_path.stem}_SubStudio.mkv")
        else:
            output_path = str(video_input_path.parent / f"{video_input_path.stem}.mkv")
            # Avoid overwriting if original IS an mkv and we are not cleaning up
            if output_path == video_path:
                output_path = str(video_input_path.parent / f"{video_input_path.stem}_fixed.mkv")

        task_manager.register_artifact(output_path)
        on_progress(file_id, "muxing", 10, "Preparing FFmpeg streams...")
        logger.info(f"🎞️ [MUXER] Initializing mux for: {video_input_path.name}")

        try:
            temp_srt_paths = []
            # Start with the main video file
            input_files = [ffmpeg.input(video_path)]
            
            # 2. Save SRTs with correct naming: VideoName.[LANG].srt
            for lang_code, content in translated_srts.items():
                # Requirement: Save the SRT alongside the video
                final_srt_path = str(video_input_path.parent / f"{video_input_path.stem}.{lang_code}.srt")
                
                with open(final_srt_path, "w", encoding="utf-8") as f:
                    f.write(content)
                
                logger.info(f"💾 [SRT] Saved subtitle: {os.path.basename(final_srt_path)}")
                
                # Add to FFmpeg inputs
                input_files.append(ffmpeg.input(final_srt_path))
                temp_srt_paths.append(final_srt_path)

            # 3. Explicit Mapping
            # '0' refers to video/audio file. 'v' and 'a' maps all video and audio streams.
            # Using '*' to ensure we catch all existing audio/subtitles from the source
            output_streams = [input_files[0].video, input_files[0].audio]
            
            # Map the new SRT files (starting from input index 1)
            for i in range(1, len(input_files)):
                output_streams.append(input_files[i])

            # 4. Define Output Arguments
            output_args = {
                'c:v': 'copy',      # Stream copy video
                'c:a': 'copy',      # Stream copy audio
                'c:s': 'srt',       # Convert string to srt format for MKV
                'map_metadata': 0,  # Copy global metadata
            }

            # 5. Language Metadata (The 'langage' definition you requested)
            for i, lang_code in enumerate(translated_srts.keys()):
                # Convert 'fr' to 'fra'
                iso_lang = self.lang_map.get(lang_code.lower(), lang_code)
                
                # s:s:{i} refers to the i-th subtitle stream we are adding
                output_args[f'metadata:s:s:{i}'] = f'language={iso_lang}'
                output_args[f'metadata:s:s:{i}'] = f'title=AI {lang_code.upper()} Studio'
                
                if i == 0:
                    output_args[f'disposition:s:s:{i}'] = 'default'

            on_progress(file_id, "muxing", 50, "Merging streams (Fast Copy)...")

            # 6. Execution
            process = (
                ffmpeg
                .output(*output_streams, output_path, **output_args)
                .overwrite_output()
                .run_async(pipe_stdin=True, quiet=True)
            )

            task_manager.active_pid = process.pid
            logger.info(f"⚙️ [FFMPEG] Muxing PID: {process.pid}")

            process.wait()
            task_manager.active_pid = None

            if process.returncode != 0:
                raise Exception(f"FFmpeg failed with code {process.returncode}. Check if source file is corrupt.")

            # 7. Final Cleanup Logic (Studio Cleanup)
            if cleanup_original:
                logger.info(f"🧹 [CLEANUP] Removing original source: {video_input_path.name}")
                if os.path.exists(video_path):
                    os.remove(video_path)

            logger.info(f"✅ [MUXER] Success! Created: {os.path.basename(output_path)}")
            on_progress(file_id, "done", 100, "Processing complete!")
            
            return output_path

        except Exception as e:
            logger.error(f"❌ [MUXER] Muxing failed: {str(e)}")
            task_manager.active_pid = None
            raise e