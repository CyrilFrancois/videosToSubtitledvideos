import ffmpeg
import os
import logging
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger("SubStudio.Muxer")

class VideoMuxer:
    def __init__(self):
        # ISO 639-2 map for MKV metadata compatibility
        self.lang_map = {
            'fr': 'fra', 'en': 'eng', 'es': 'spa', 'de': 'deu',
            'it': 'ita', 'pt': 'por', 'nl': 'nld', 'ja': 'jpn',
            'ko': 'kor', 'zh': 'zho', 'ru': 'rus'
        }

    def mux(
        self, 
        video_path: str, 
        srts: Dict[str, str], 
        strip_existing: bool = False,
        cleanup_original: bool = False
    ) -> str:
        video_input_path = Path(video_path)
        # Using .mkv as the default container for better subtitle support
        output_path = str(video_input_path.parent / f"{video_input_path.stem}_SubStudio.mkv")
        
        main_input = ffmpeg.input(video_path)
        input_streams = [main_input]
        
        # 1. Create Temp SRT files
        tmp_srt_paths = []
        for lang_code, content in srts.items():
            tmp_path = video_input_path.parent / f"{video_input_path.stem}.{lang_code}.tmp.srt"
            with open(tmp_path, 'w', encoding='utf-8') as f:
                f.write(content)
            tmp_srt_paths.append(tmp_path)
            input_streams.append(ffmpeg.input(str(tmp_path)))

        try:
            # 2. Map streams: Video, Audio, (Existing Subs?), then New Subs
            output_list = [main_input['v'], main_input['a']]
            
            if not strip_existing:
                output_list.append(main_input['s?'])
            
            for i in range(1, len(input_streams)):
                output_list.append(input_streams[i])

            # 3. Output arguments
            output_args = {
                'c': 'copy',
                'scodec': 'srt'
            }

            # 4. Apply metadata (Corrected for FFmpeg 7.1 syntax)
            # In FFmpeg, 'title' for a specific stream is also a metadata key.
            for i, lang_code in enumerate(srts.keys()):
                iso_lang = self.lang_map.get(lang_code.lower(), lang_code)
                
                # Use the 'metadata:s:s:i' prefix for all stream-level tags
                output_args[f'metadata:s:s:{i}'] = [
                    f'language={iso_lang}',
                    f'title=AI-{lang_code.upper()}'
                ]

            logger.info(f"🛠️ FFmpeg: Muxing into {video_input_path.name}")
            
            (
                ffmpeg
                .output(*output_list, output_path, **output_args)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            # 5. Cleanup temp files
            for p in tmp_srt_paths:
                if p.exists(): p.unlink()

            if cleanup_original:
                if os.path.exists(output_path) and str(video_input_path) != output_path:
                    logger.info(f"🧹 Removing original: {video_input_path.name}")
                    video_input_path.unlink()

            return output_path

        except ffmpeg.Error as e:
            err = e.stderr.decode() if e.stderr else str(e)
            for p in tmp_srt_paths:
                if p.exists(): p.unlink()
            logger.error(f"❌ FFmpeg Error: {err}")
            raise Exception(f"Muxing failed: {err}")