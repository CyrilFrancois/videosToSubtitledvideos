import os
import logging
import time
from openai import OpenAI
from typing import Callable, Any, List

logger = logging.getLogger("SubStudio.Translator")

class SubtitleTranslator:
    def __init__(self, api_key: str = None):
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"  # High intelligence, low latency

    def get_context_profile(self, filename: str) -> str:
        """
        Research Phase: Identifies the show/movie to ensure character names 
        and gender-specific grammar are correct.
        """
        logger.info(f"AI searching filename context: {filename}")
        
        prompt = f"""Identify the media from this filename: '{filename}'
        Return a 'Story Bible' for a translator:
        - Series/Movie Title
        - Characters (Names, Genders, talking default)
        - Tone (Slang, Formal, Medical, Sci-Fi)
        - Brief Plot Context
        If unknown, infer from keywords."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"   ❌ Context Research failed: {e}")
            return "Neutral media content. No specific character data."

    def refine_and_translate(
        self, 
        srt_content: str, 
        target_lang: str, 
        file_id: str, 
        on_progress: Callable, 
        task_manager: Any,
        context_profile: str,
        current_file: int,
        total_files: int,
        is_whisper_source: bool = False
    ) -> str:
        """
        Processes the SRT in batches to avoid token limits and maintain format.
        Includes terminal logging for every 20% of progress.
        """
        blocks = srt_content.strip().split('\n\n')
        batch_size = 30 
        results = []
        total_batches = (len(blocks) + batch_size - 1) // batch_size
        
        prefix = f"[{current_file}/{total_files} Files]"
        logger.info(f"Translating {len(blocks)} blocks into {target_lang.upper()}...")

        last_logged_pct = -1

        for i in range(0, len(blocks), batch_size):
            if task_manager.is_aborted:
                logger.warning(f"   🛑 {prefix} Translation aborted by user.")
                return ""

            batch = blocks[i : i + batch_size]
            batch_text = "\n\n".join(batch)
            current_batch_idx = (i // batch_size) + 1
            
            # Progress calculation for Frontend (stays within Step 4 range)
            progress_pct = 40 + int((current_batch_idx / total_batches) * 40)
            on_progress(file_id, "translating", progress_pct, 
                        f"{prefix} Step 4/5: Translating {target_lang.upper()} ({current_batch_idx}/{total_batches})")

            # Terminal logging every 20%
            completion_pct = int((current_batch_idx / total_batches) * 100)
            if completion_pct >= last_logged_pct + 20:
                logger.info(f"Translation Progress ({target_lang.upper()}): {completion_pct}%")
                last_logged_pct = (completion_pct // 20) * 20

            system_prompt = self._build_system_prompt(target_lang, context_profile, is_whisper_source)

            try:
                translated_batch = self._call_llm(system_prompt, batch_text)
                results.append(translated_batch)
            except Exception as e:
                logger.error(f"   ❌ {prefix} Batch {current_batch_idx} failed: {e}")
                results.append(batch_text) # Fallback to original

        return "\n\n".join(results)

    def _call_llm(self, system_prompt: str, user_content: str, retries=2) -> str:
        """Wrapper for OpenAI call with specific SRT formatting enforcement."""
        for attempt in range(retries + 1):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    temperature=0.2 
                )
                content = response.choices[0].message.content.strip()
                # Clean up AI formatting artifacts
                return content.replace("```srt", "").replace("```", "").strip()
            except Exception as e:
                if attempt == retries: raise e
                time.sleep(2)
        return user_content

    def _build_system_prompt(self, lang: str, context: str, is_whisper: bool) -> str:
        whisper_instruction = ""
        if is_whisper:
            whisper_instruction = """
            NOTE: Source is AI-transcribed and may have phonetic errors. 
            Use the provided context bible to fix character names and terms in the speech.
            No other information than the translation.
            """

        return f"""You are an expert subtitle translator ({lang}).
        {whisper_instruction}
        
        STORY BIBLE FOR CONTEXT:
        {context}

        RULES:
        1. Keep TIMESTAMPS and INDEX NUMBERS exactly as provided.
        2. Preserve SRT structure: [Index]\\n[Time] --> [Time]\\n[Text]\\n\\n
        3. Translate only the text content. Don't add the name of the people talking... focus only on the translation.
        4. Do not include any explanations or markdown.
        """