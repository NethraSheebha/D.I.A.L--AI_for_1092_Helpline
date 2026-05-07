from __future__ import annotations
import numpy as np
from transformers import pipeline
import torch
import os
from typing import Tuple, Optional

# Shared global model to avoid reloading on every call
_shared_model = None

class IndicConformerSTT:
    """Incremental STT wrapper using Indic-Conformer."""
    def __init__(
        self,
        model_name: str = "openai/whisper-tiny",
        device: str = "cpu",
        sample_rate: int = 16000,
    ) -> None:
        self.model_name = model_name
        self.device = device
        self.sample_rate = sample_rate
        try:
            self.pipeline = pipeline(
                task="automatic-speech-recognition",
                model=self.model_name,
                device=0 if self.device == "cuda" else -1,
            )
        except Exception as e:
            print(f"[STT] Error: Could not load local STT model '{model_name}': {e}")
            self.pipeline = None
        self.buffer = np.zeros(0, dtype=np.int16)
        self.partial_transcript = ""
        self.final_transcripts: list[str] = []

    def append_pcm(self, pcm_bytes: bytes) -> str:
        """Append raw PCM bytes and update partial transcript."""
        if not pcm_bytes:
            return self.partial_transcript

        samples = np.frombuffer(pcm_bytes, dtype=np.int16)
        self.buffer = np.concatenate([self.buffer, samples])

        if len(self.buffer) >= int(self.sample_rate * 0.8):
            self.partial_transcript = self._decode(self.buffer)

        return self.partial_transcript

    def finalize_segment(self) -> str | None:
        """Mark the current audio buffer as final and reset the segment buffer."""
        if self.buffer.size == 0:
            return None

        final_text = self._decode(self.buffer)
        if final_text:
            self.final_transcripts.append(final_text)

        self.buffer = np.zeros(0, dtype=np.int16)
        self.partial_transcript = ""
        return final_text

    def _decode(self, samples: np.ndarray) -> str:
        if self.pipeline is None:
            return self.partial_transcript
        waveform = samples.astype(np.float32) / 32768.0
        try:
            output = self.pipeline(waveform)
            return output["text"]
        except Exception as e:
            print(f"[STT] Decoding Error: {e}")
            return self.partial_transcript

# Global initialization function called by FastAPI lifespan
async def initialize_stt():
    print("[STT] Initializing Indic-Conformer model...")
    return IndicConformerSTT()
