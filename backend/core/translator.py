import os
from openai import OpenAI
from typing import Callable

class SubtitleTranslator:
    def __init__(self, api_key: str = None):
        # Fallback to env variable if not provided
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini" # Fast and cost-effective for translation

    def _generate_system_prompt(self, target_lang: str):
        return f"""You are a professional subtitle translator. 
Translate the following SRT content into {target_lang}.
STRICT RULES:
1. Keep the exact same subtitle numbers and timestamps.
2. Maintain the SRT format structure perfectly.
3. Translate the dialogue naturally, preserving the tone and context.
4. Output ONLY the translated SRT content. No explanations or intro text."""

    def translate_srt(self, srt_content: str, target_lang: str, file_id: str, on_progress: Callable):
        """Translates SRT content in batches to preserve context and stay within token limits."""
        lines = srt_content.strip().split('\n\n')
        batch_size = 30 # Number of subtitle blocks per LLM request
        translated_blocks = []
        
        total_batches = (len(lines) + batch_size - 1) // batch_size

        for i in range(0, len(lines), batch_size):
            batch = "\n\n".join(lines[i : i + batch_size])
            current_batch_num = (i // batch_size) + 1
            
            on_progress(file_id, "translating", int((current_batch_num / total_batches) * 100), 
                        f"Translating batch {current_batch_num}/{total_batches}...")

            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._generate_system_prompt(target_lang)},
                        {"role": "user", "content": batch}
                    ],
                    temperature=0.3
                )
                translated_blocks.append(response.choices[0].message.content.strip())
            except Exception as e:
                print(f"Translation error at batch {current_batch_num}: {e}")
                # Fallback: keep original if translation fails for this specific batch
                translated_blocks.append(batch)

        return "\n\n".join(translated_blocks)