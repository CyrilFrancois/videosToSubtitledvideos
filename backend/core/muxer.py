import ffmpeg
import os
import logging
import tempfile
from pathlib import Path
from typing import Callable, Any, Dict
from langdetect import detect, DetectorFactory

DetectorFactory.seed = 0
logger = logging.getLogger("SubStudio.Muxer")

class VideoMuxer:
    def __init__(self):
        self.lang_map = {
            'fr': 'fra', 'en': 'eng', 'es': 'spa', 'de': 'deu',
            'it': 'ita', 'pt': 'por', 'nl': 'nld', 'ja': 'jpn',
            'ko': 'kor', 'zh': 'zho', 'ru': 'rus'
        }

    def _detect_stream_language(self, video_path: str, stream_index: int) -> str:
        try:
            with tempfile.NamedTemporaryFile(suffix=".srt", delete=False) as tmp:
                tmp_path = tmp.name

            (
                ffmpeg
                .input(video_path, t=30)
                .output(tmp_path, map=f"0:s:{stream_index}", format="srt")
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            with open(tmp_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            if os.path.exists(tmp_path): os.remove(tmp_path)
            lines = [l for l in content.splitlines() if not l.isdigit() and '-->' not in l and l.strip()]
            sample_text = " ".join(lines[:10])
            if not sample_text.strip(): return "eng"

            detected_code = detect(sample_text)
            return self.lang_map.get(detected_code, detected_code)
        except Exception:
            return "eng"

    def mux(
        self, 
        video_path: str, 
        translated_srts: Dict[str, str], 
        file_id: str, 
        on_progress: Callable,
        task_manager: Any,
        cleanup_original: bool = False
    ) -> str:
        video_input_path = Path(video_path)
        output_path = str(video_input_path.parent / f"{video_input_path.stem}_SubStudio.mkv")
        
        task_manager.register_artifact(output_path)
        on_progress(file_id, "muxing", 10, "Preparing streams...")

        try:
            probe = ffmpeg.probe(video_path)
            streams = probe.get('streams', [])
            
            v_count = len([s for s in streams if s['codec_type'] == 'video'])
            a_count = len([s for s in streams if s['codec_type'] == 'audio'])
            s_count = len([s for s in streams if s['codec_type'] == 'subtitle'])
            
            # 1. Initialize Inputs
            main_input = ffmpeg.input(video_path)
            # We start the output node with the main video/audio streams
            output_node = main_input

            # 2. Add SRT Inputs and prepare Mapping
            # We use .output() with multiple inputs. 
            # To avoid the comma-mapping error, we manually define the stream specifiers.
            srt_inputs = []
            srt_keys = list(translated_srts.keys())
            
            for lang_code in srt_keys:
                srt_path = str(video_input_path.parent / f"{video_input_path.stem}.{lang_code}.srt")
                with open(srt_path, "w", encoding="utf-8") as f:
                    f.write(translated_srts[lang_code])
                
                srt_inputs.append(ffmpeg.input(srt_path))

            # 3. Build Arguments Dictionary (Excluding 'map')
            output_args = {
                'c': 'copy',
                'map_metadata': 0,
            }

            # 4. Metadata for existing subtitles
            for idx in range(s_count):
                out_idx = v_count + a_count + idx
                existing_s = [s for s in streams if s['codec_type'] == 'subtitle'][idx]
                lang = existing_s.get('tags', {}).get('language', 'und')
                if lang == 'und':
                    lang = self._detect_stream_language(video_path, idx)
                output_args[f'metadata:s:{out_idx}'] = f'language={lang}'

            # 5. Metadata for New AI Subtitles
            for i, lang_code in enumerate(srt_keys):
                out_idx = v_count + a_count + s_count + i
                iso_lang = self.lang_map.get(lang_code.lower(), lang_code)
                logger.info("plop1" + iso_lang)
                
                output_args[f'metadata:s:{out_idx}'] = f'language={iso_lang}'
                # Use a single string for multiple metadata tags if needed, 
                # but ffmpeg-python handles multiple metadata keys fine if keys are unique.
                # output_args[f'metadata:s:{out_idx}'] += f":title=AI {lang_code.upper()}"

                logger.info(output_args)
                #{'c': 'copy', 'map_metadata': 0, 'metadata:s:2': 'language=fra:title=AI FR'}
                
                # Disposition
                disposition = 'default' if i == 0 else '0'
                output_args[f'disposition:s:{out_idx}'] = disposition

            on_progress(file_id, "muxing", 50, "Merging streams...")

            # 6. Final Assembly
            # We explicitly map stream 0 (all streams from video) and stream 0 from each srt
            input_files = [main_input] + srt_inputs

            logger.info(input_files)
            
            # Create the final process
            # We use global_args to force separate -map flags which prevents the '0, 1:0' error
            process = ffmpeg.output(*input_files, output_path, **output_args)
            
            # Manually inject separate map flags to bypass the library's auto-joining
            process = process.global_args('-map', '0')
            for i in range(1, len(input_files)):
                process = process.global_args('-map', f'{i}:0')

            try:
                process.overwrite_output().run(capture_stdout=True, capture_stderr=True)
            except ffmpeg.Error as e:
                err_msg = e.stderr.decode() if e.stderr else str(e)
                raise Exception(f"FFmpeg failed: {err_msg}")

            if cleanup_original:
                try:
                    os.remove(video_path)
                except Exception as e:
                    logger.warning(f"Could not cleanup original file: {e}")

            on_progress(file_id, "done", 100, "Muxing complete!")
            return output_path

        except Exception as e:
            logger.error(f"❌ [MUXER] Muxing failed: {str(e)}")
            raise e