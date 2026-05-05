from __future__ import annotations
import numpy as np
from faster_whisper import WhisperModel
import torch
import os
from typing import Tuple, Optional

# Shared global model to avoid reloading on every call
_shared_model = None

class IndicConformerSTT:
    """Incremental STT wrapper using faster-whisper."""
    def __init__(
        self,
        model_size: str = None,
        device: str = None,
        compute_type: str = None,
        sample_rate: int = 16000,
    ) -> None:
        self.sample_rate = sample_rate
        
        # Load settings from environment if not provided
        self.model_size = model_size or os.getenv("WHISPER_MODEL_SIZE", "small")
        self.device = device or os.getenv("WHISPER_DEVICE", "cpu")
        self.compute_type = compute_type or os.getenv("WHISPER_COMPUTE_TYPE", "int8")
        
        global _shared_model
        if _shared_model is None:
            # Fallback for manual instantiation
            _shared_model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type
            )
            
        self.model = _shared_model
        self.buffer = np.zeros(0, dtype=np.int16)
        self.partial_transcript = ""
        self.final_transcripts: list[str] = []

    def append_pcm(self, pcm_bytes: bytes) -> str:
        """Append raw PCM bytes and update partial transcript."""
        if not pcm_bytes:
            return self.partial_transcript
            
        samples = np.frombuffer(pcm_bytes, dtype=np.int16)
        self.buffer = np.concatenate([self.buffer, samples])
        
        # Process every 1.0s of audio for Whisper (more stable than 0.5s)
        if len(self.buffer) >= int(self.sample_rate * 1.0):
            self.partial_transcript = self._decode(self.buffer, beam_size=1) # Fast partial
            
        return self.partial_transcript

    def finalize_segment(self) -> str | None:
        """Mark the current audio buffer as final and reset the segment buffer."""
        if self.buffer.size == 0:
            return None
            
        # Full decode for the final segment
        final_text = self._decode(self.buffer, beam_size=5)
        if final_text:
            self.final_transcripts.append(final_text)
            
        self.buffer = np.zeros(0, dtype=np.int16)
        self.partial_transcript = ""
        return final_text

    def reset(self) -> None:
        self.buffer = np.zeros(0, dtype=np.int16)
        self.partial_transcript = ""
        self.final_transcripts.clear()

    def _decode(self, samples: np.ndarray, beam_size: int = 5) -> str:
        # Whisper expects float32 in range [-1, 1]
        waveform = samples.astype(np.float32) / 32768.0
        try:
            # We use beam_size=1 for partials to be fast, higher for final
            segments, info = self.model.transcribe(
                waveform, 
                beam_size=beam_size,
                language="kn", # Force Kannada as requested by project context
                task="transcribe"
            )
            
            text = "".join([s.text for s in segments]).strip()
            return text
        except Exception as e:
            print(f"[STT] Decoding Error: {e}")
            return self.partial_transcript

# Global initialization function called by FastAPI lifespan
async def initialize_stt():
    global _shared_model
    if _shared_model is None:
        model_size = os.getenv("WHISPER_MODEL_SIZE", "small")
        device = os.getenv("WHISPER_DEVICE", "cpu")
        compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
        
        print(f"[STT] Initializing shared Whisper model ({model_size}) on {device}...")
        _shared_model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type
        )
    return _shared_model
