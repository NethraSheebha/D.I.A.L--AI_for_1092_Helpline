from __future__ import annotations

import io
import re
from typing import Iterator, List

import numpy as np
import soundfile as sf
from transformers import pipeline


class IndicParlerTTS:
    """Sentence-level streaming TTS wrapper for ai4bharat/indic-parler-tts."""

    PUNCTUATION_PATTERN = re.compile(r"(.+?[\,\.!\?])(?:\s+|$)", re.DOTALL)

    def __init__(
        self,
        model_name: str = "ai4bharat/indic-parler-tts",
        sample_rate: int = 24000,
        device: int = -1,
    ) -> None:
        self.model_name = model_name
        self.sample_rate = sample_rate
        self.device = device
        self.pipeline = pipeline(
            task="text-to-speech",
            model=self.model_name,
            device=self.device,
        )
        self.buffer = ""

    def enqueue_text(self, text: str, continue_flag: bool = True) -> List[bytes]:
        """Buffer text and synthesize completed segments when punctuation is seen."""
        self.buffer += (" " if self.buffer else "") + text.strip()
        chunks: List[bytes] = []

        while True:
            match = self.PUNCTUATION_PATTERN.match(self.buffer)
            if not match:
                break
            segment = match.group(1).strip()
            self.buffer = self.buffer[match.end():].strip()
            chunks.append(self.synthesize(segment, continue_flag=continue_flag))

        return chunks

    def flush(self, continue_flag: bool = False) -> bytes | None:
        """Synthesize any remaining buffered text at the end of a turn."""
        if not self.buffer:
            return None
        segment = self.buffer.strip()
        self.buffer = ""
        return self.synthesize(segment, continue_flag=continue_flag)

    def synthesize(self, text_chunk: str, continue_flag: bool = True) -> bytes:
        """Convert a textual segment into raw PCM audio bytes."""
        output = self.pipeline(text_chunk)
        audio = output["audio"] if isinstance(output, dict) else output

        if hasattr(audio, "array"):
            audio_array = audio.array
        elif isinstance(audio, np.ndarray):
            audio_array = audio
        else:
            raise RuntimeError("Unexpected audio output format from TTS pipeline")

        pcm_int16 = self._float32_to_int16(audio_array)
        return pcm_int16.tobytes()

    def _float32_to_int16(self, audio: np.ndarray) -> np.ndarray:
        clipped = np.clip(audio, -1.0, 1.0)
        return (clipped * 32767).astype(np.int16)
