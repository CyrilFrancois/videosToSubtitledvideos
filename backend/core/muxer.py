import os
import logging
import subprocess
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger("SubStudio.Muxer")


class VideoMuxer:
    def __init__(self):
        # ISO 639-2 map for MKV metadata compatibility
        self.lang_map = {
            "fr": "fra", "en": "eng", "es": "spa", "de": "deu",
            "it": "ita", "pt": "por", "nl": "nld", "ja": "jpn",
            "ko": "kor", "zh": "zho", "ru": "rus"
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
        output_path = video_input_path.parent / f"{video_input_path.stem}_SubStudio.mkv"
        prefix = f"[{current_file}/{total_files} Files]"

        tmp_srt_paths: List[tuple] = []

        # ------------------------------------------------
        # 1. Write temporary SRT files
        # ------------------------------------------------
        for lang_code, content in srts.items():
            tmp_path = video_input_path.parent / f"{video_input_path.stem}.{lang_code}.tmp.srt"
            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(content)
            tmp_srt_paths.append((lang_code, tmp_path))

        try:
            logger.info(f"🛠️ {prefix} Finalizing: {video_input_path.name}")

            # ------------------------------------------------
            # 2. Build FFmpeg command safely
            # ------------------------------------------------
            cmd = ["ffmpeg", "-y"]

            # Main video input
            cmd += ["-i", str(video_input_path)]

            # Add each SRT as additional input
            for _, srt_path in tmp_srt_paths:
                cmd += ["-i", str(srt_path)]

            # ------------------------------------------------
            # 3. Mapping
            # ------------------------------------------------

            if strip_existing:
                # Only map video and audio
                cmd += ["-map", "0:v"]
                cmd += ["-map", "0:a"]
            else:
                # Map everything from original (video, audio, subs)
                cmd += ["-map", "0"]

            # Map each new subtitle stream
            # Input indices: 0 = video, 1..N = SRTs
            for i in range(len(tmp_srt_paths)):
                cmd += ["-map", f"{i + 1}:0"]

            # ------------------------------------------------
            # 4. Codecs
            # ------------------------------------------------

            cmd += ["-c:v", "copy"]
            cmd += ["-c:a", "copy"]
            cmd += ["-c:s", "srt"]  # Correct for MKV

            # ------------------------------------------------
            # 5. Metadata for new subtitle streams
            # ------------------------------------------------

            # Subtitle stream index in output is relative to subtitle streams only.
            # Since we append new subtitles AFTER original streams,
            # metadata must target only the newly added subtitle streams.

            for index, (lang_code, _) in enumerate(tmp_srt_paths):
                iso_lang = self.lang_map.get(lang_code.lower(), lang_code.lower())
                cmd += [f"-metadata:s:s:{index}", f"language={iso_lang}"]
                cmd += [f"-metadata:s:s:{index}", f"title=AI {lang_code.upper()}"]

            # Output file
            cmd += [str(output_path)]

            # ------------------------------------------------
            # 6. Execute
            # ------------------------------------------------
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True
            )

            if process.returncode != 0:
                raise RuntimeError(process.stderr)

            # ------------------------------------------------
            # 7. Cleanup
            # ------------------------------------------------
            for _, p in tmp_srt_paths:
                if p.exists():
                    p.unlink()

            if cleanup_original:
                if output_path.exists() and video_input_path.resolve() != output_path.resolve():
                    logger.info(f"{prefix} Cleanup: Removing original file.")
                    video_input_path.unlink()

            return str(output_path)

        except Exception as e:
            for _, p in tmp_srt_paths:
                if p.exists():
                    p.unlink()

            logger.error(f"❌ {prefix} Muxing Error: {str(e)}")
            raise Exception(f"Muxing failed: {str(e)}")
