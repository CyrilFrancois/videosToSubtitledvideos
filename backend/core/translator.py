import os
import logging
from openai import OpenAI
from typing import Callable, Any, Optional

logger = logging.getLogger("SubStudio.Translator")

class SubtitleTranslator:
    def __init__(self, api_key: str = None):
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini" 

    def get_context_profile(self, filename: str) -> str:
        """
        Phase 0: Research the filename to create a 'Story Bible'.
        """
        logger.info(f"🔍 [LLM] Generating context profile for: {filename}")
        prompt = f"""Identify this movie or TV show from the filename: '{filename}'
        Provide a concise profile for subtitle correction:
        1. Plot Summary (2 sentences).
        2. Main Characters (Names and Genders).
        3. Setting/Tone (e.g., Sci-Fi, Technical, Slang-heavy).
        If the file is unknown, describe general likely context based on the words in the title."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2
            )
            profile = response.choices[0].message.content.strip()
            logger.info("✅ [LLM] Context Profile Created.")
            return profile
        except Exception as e:
            logger.error(f"❌ [LLM] Context injection failed: {e}")
            return "General media content, neutral tone."

    def refine_and_translate(
        self, 
        srt_content: str, 
        target_lang: str, 
        file_id: str, 
        on_progress: Callable, 
        task_manager: Any,
        context_profile: str,
        is_whisper_source: bool = False
    ):
        """
        Phases 1 & 2: Fix Whisper errors using Context, then Translate.
        """
        lines = srt_content.strip().split('\n\n')
        batch_size = 25 
        translated_blocks = []
        total_batches = (len(lines) + batch_size - 1) // batch_size

        for i in range(0, len(lines), batch_size):
            # Check for Kill Switch
            if task_manager.is_aborted:
                logger.warning(f"🛑 [LLM] Translation aborted at batch {i}")
                return None

            batch = "\n\n".join(lines[i : i + batch_size])
            current_batch_num = (i // batch_size) + 1
            
            # Update terminal and UI
            progress_step = "Refining & Translating" if is_whisper_source else "Translating"
            on_progress(file_id, "translating", int((current_batch_num / total_batches) * 100), 
                        f"{progress_step} batch {current_batch_num}/{total_batches}...")

            system_prompt = self._generate_system_prompt(target_lang, context_profile, is_whisper_source)

            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"CONTEXT BIBLE:\n{context_profile}\n\nSRT BATCH:\n{batch}"}
                    ],
                    temperature=0.3
                )
                translated_blocks.append(response.choices[0].message.content.replace("```srt","").replace("```","").strip())
                
                if i % 50 == 0:
                    logger.info(f"🧵 [LLM] Processed {current_batch_num}/{total_batches} batches...")

            except Exception as e:
                logger.error(f"❌ [LLM] Error at batch {current_batch_num}: {e}")
                translated_blocks.append(batch) # Fallback to original

        return "\n\n".join(translated_blocks)

    def _generate_system_prompt(self, target_lang: str, context: str, is_whisper: bool):
        correction_logic = ""
        if is_whisper:
            correction_logic = """
            CRITICAL: The source text comes from AI transcription (Whisper). 
            It may have phonetic errors (wrong names, similar sounding words).
            Use the CONTEXT BIBLE to:
            1. Correct character names and genders.
            2. Fix nonsensical sentences based on the plot summary.
            3. Ensure technical terms match the setting.
            """

        return f"""You are a professional subtitle editor and translator.
        {correction_logic}
        
        TASK: Translate the provided SRT batch into {target_lang}.
        STRICT RULES:
        1. Keep exact same subtitle numbers and timestamps.
        2. Preserve SRT formatting.
        3. Output ONLY the translated SRT content."""