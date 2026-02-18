import ffmpeg
import os
import logging
from pathlib import Path
from typing import Dict

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
        current_file: int,
        total_files: int,
        strip_existing: bool = False,
        cleanup_original: bool = False
    ) -> str:
        video_input_path = Path(video_path)
        output_path = str(video_input_path.parent / f"{video_input_path.stem}_SubStudio.mkv")
        
        # Consistent prefix for logging
        prefix = f"[{current_file}/{total_files} Files]"
        
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

            # 4. Apply metadata (Fixing "Track 1" issue)
            # We must pass these as separate dictionary entries. 
            # Note: Indexing 's:s:i' refers to the i-th subtitle stream in the OUTPUT.
            for i, lang_code in enumerate(srts.keys()):
                iso_lang = self.lang_map.get(lang_code.lower(), lang_code)
                
                # To ensure FFmpeg picks up both, we combine them into a single metadata call 
                # or use the positional index logic. Most reliable for Track Names:
                output_args[f'metadata:s:s:{i}'] = f"language={iso_lang}"
                # We use a separate key for the title to prevent overwriting
                output_args[f'metadata:s:s:{i}+title'] = f"AI {lang_code.upper()}"

            logger.info(f"🛠️ {prefix} Step 5/5: Finalizing MKV container...")
            logger.info(f"   {prefix} Muxing {len(srts)} subtitle tracks into {video_input_path.name}")
            
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
                    logger.info(f"   {prefix} Cleanup: Removing original file.")
                    video_input_path.unlink()

            return output_path

        except ffmpeg.Error as e:
            err = e.stderr.decode() if e.stderr else str(e)
            for p in tmp_srt_paths:
                if p.exists(): p.unlink()
            logger.error(f"❌ {prefix} FFmpeg Muxing Error: {err}")
            raise Exception(f"Muxing failed: {err}")