import ffmpeg
import os
from pathlib import Path
from typing import Callable

class VideoMuxer:
    def __init__(self):
        pass

    def mux_subtitles(
        self, 
        video_path: str, 
        srt_path: str, 
        output_lang: str, 
        file_id: str, 
        on_progress: Callable
    ) -> str:
        """
        Muxes an external SRT file into a new MKV container.
        Uses 'copy' codec for video and audio to ensure zero quality loss and high speed.
        """
        on_progress(file_id, "muxing", 10, "Initializing FFmpeg muxer...")
        
        video_input = Path(video_path)
        # Create output filename (e.g., video_translated.mkv)
        output_path = str(video_input.parent / f"{video_input.stem}_translated.mkv")
        
        try:
            # Setup inputs
            input_v = ffmpeg.input(video_path)
            input_s = ffmpeg.input(srt_path)

            on_progress(file_id, "muxing", 50, "Merging streams into MKV container...")

            # Define the muxing process
            # v:c copy = don't re-encode video
            # a:c copy = don't re-encode audio
            # s:c srt = encode subtitle text
            (
                ffmpeg
                .output(
                    input_v['v'], 
                    input_v['a'], 
                    input_s, 
                    output_path,
                    vcodec='copy', 
                    acodec='copy', 
                    scodec='srt',
                    **{
                        'metadata:s:s:0': f'language={output_lang}',
                        'disposition:s:s:0': 'default'
                    }
                )
                .overwrite_output()
                .run(quiet=True)
            )

            on_progress(file_id, "muxing", 100, "Muxing complete!")
            return output_path

        except ffmpeg.Error as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            print(f"FFmpeg Muxing Error: {error_msg}")
            raise Exception(f"Muxing failed: {error_msg}")

    def cleanup_originals(self, original_path: str, temp_files: list):
        """Removes temporary SRTs and optionally the original video."""
        for f in temp_files:
            if os.path.exists(f):
                os.remove(f)
        # Note: Actual original video deletion should be handled with caution 
        # based on user settings in the main orchestration logic.