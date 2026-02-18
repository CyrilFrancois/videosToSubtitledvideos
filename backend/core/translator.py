import os
import logging
import time
from openai import OpenAI
from typing import Callable, Any, List

logger = logging.getLogger("SubStudio.Translator")

class SubtitleTranslator:
    def __init__(self, api_key: str = None):
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini" # High intelligence, low latency

    def get_context_profile(self, filename: str) -> str:
        """
        Research Phase: Identifies the show/movie to ensure character names 
        and gender-specific grammar (especially for FR/ES/DE) are correct.
        """
        logger.info(f"🔍 Analyzing filename context: {filename}")
        
        prompt = f"""Identify the media from this filename: '{filename}'
        Return a 'Story Bible' for a translator:
        - Series/Movie Title
        - Lead Characters (Names & Genders)
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
            logger.error(f"❌ Context Research failed: {e}")
            return "Neutral media content. No specific character data."

    def refine_and_translate(
        self, 
        srt_content: str, 
        target_lang: str, 
        file_id: str, 
        on_progress: Callable, 
        task_manager: Any,
        context_profile: str,
        is_whisper_source: bool = False
    ) -> str:
        """
        Processes the SRT in batches to avoid token limits and maintain format.
        """
        # Split into blocks, but keep empty lines to maintain integrity
        blocks = srt_content.strip().split('\n\n')
        batch_size = 30 
        results = []
        total_batches = (len(blocks) + batch_size - 1) // batch_size

        logger.info(f"🌐 Translating {len(blocks)} blocks into {target_lang}...")

        for i in range(0, len(blocks), batch_size):
            if task_manager.is_aborted:
                logger.warning("🛑 Translation aborted by user.")
                return ""

            batch = blocks[i : i + batch_size]
            batch_text = "\n\n".join(batch)
            current_batch = (i // batch_size) + 1
            
            # Progress tracking for Frontend
            progress_pct = 10 + int((current_batch / total_batches) * 85)
            on_progress(file_id, "translating", progress_pct, 
                        f"Translating {target_lang.upper()} (Batch {current_batch}/{total_batches})")

            system_prompt = self._build_system_prompt(target_lang, context_profile, is_whisper_source)

            try:
                # Retry logic for API hiccups
                translated_batch = self._call_llm(system_prompt, batch_text)
                results.append(translated_batch)
            except Exception as e:
                logger.error(f"❌ Batch {current_batch} failed: {e}")
                results.append(batch_text) # Fallback to original so the file isn't empty

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
                    temperature=0.2 # Lower temperature = more consistent SRT format
                )
                content = response.choices[0].message.content.strip()
                # Remove any markdown code block wrappers if the AI adds them
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
            Use the provided context bible to fix character names and terms.
            """

        return f"""You are an expert subtitle translator ({lang}).
        {whisper_instruction}
        
        STORY BIBLE FOR CONTEXT:
        {context}

        RULES:
        1. Keep TIMESTAMPS and INDEX NUMBERS exactly as provided.
        2. Preserve SRT structure: [Index]\\n[Time] --> [Time]\\n[Text]\\n\\n
        3. Translate only the text content.
        4. Do not include any explanations or markdown.
        """