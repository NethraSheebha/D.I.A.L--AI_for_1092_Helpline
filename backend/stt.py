from __future__ import annotations

import numpy as np
from transformers import pipeline


class IndicConformerSTT:
    """Incremental STT wrapper for ai4bharat/indic-conformer-600m-multilingual."""

    def __init__(
        self,
        model_name: str = "ai4bharat/indic-conformer-600m-multilingual",
        sample_rate: int = 16000,
        device: int = -1,
    ) -> None:
        self.sample_rate = sample_rate
        self.device = device
        self.model_name = model_name
        self.asr = pipeline(
            task="automatic-speech-recognition",
            model=self.model_name,
            device=self.device,
            chunk_length_s=10,
        )
        self.buffer = np.zeros(0, dtype=np.int16)
        self.partial_transcript = ""
        self.final_transcripts: list[str] = []

    def append_pcm(self, pcm_bytes: bytes) -> str:
        """Append raw PCM bytes and update partial transcript."""
        if not pcm_bytes:
            return self.partial_transcript

        samples = np.frombuffer(pcm_bytes, dtype=np.int16)
        self.buffer = np.concatenate([self.buffer, samples])

        if len(self.buffer) >= int(self.sample_rate * 0.5):
            self.partial_transcript = self._decode(self.buffer)

        return self.partial_transcript

    def finalize_segment(self) -> str | None:
        """Mark the current audio buffer as final and reset the segment buffer."""
        if self.buffer.size == 0:
            return None

        final_text = self._decode(self.buffer)
        self.final_transcripts.append(final_text)
        self.buffer = np.zeros(0, dtype=np.int16)
        self.partial_transcript = ""
        return final_text

    def reset(self) -> None:
        self.buffer = np.zeros(0, dtype=np.int16)
        self.partial_transcript = ""
        self.final_transcripts.clear()

    def _decode(self, samples: np.ndarray) -> str:
        waveform = samples.astype(np.float32) / 32768.0
        return self.asr(waveform, sampling_rate=self.sample_rate)["text"]
