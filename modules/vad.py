import numpy as np
from typing import Tuple, Optional
import os


class ChunkBuffer:
    def __init__(self):
        self.buffer = bytearray()
        self.sample_rate = 16000
        self.chunk_samples = 512
        self.bytes_per_sample = 2
        self.chunk_bytes = self.chunk_samples * self.bytes_per_sample
    
    def add(self, data: bytes):
        self.buffer.extend(data)
    
    def get_chunk(self) -> Optional[np.ndarray]:
        if len(self.buffer) >= self.chunk_bytes:
            chunk_data = bytes(self.buffer[:self.chunk_bytes])
            del self.buffer[:self.chunk_bytes]
            audio = np.frombuffer(chunk_data, dtype=np.int16).astype(np.float32) / 32768.0
            return audio
        return None
    
    def has_data(self) -> bool:
        return len(self.buffer) >= self.chunk_bytes
    
    def clear(self):
        self.buffer.clear()


class SileroVAD:
    def __init__(self, threshold: float = 0.5):
        self.threshold = threshold
        self.model = None
        self.sample_rate = 16000
        
    async def initialize(self):
        pass
    
    def reset_state(self):
        pass
    
    def process_chunk(self, audio_chunk: np.ndarray) -> Tuple[bool, float]:
        if len(audio_chunk) != 512:
            return False, 0.0
        
        rms = np.sqrt(np.mean(audio_chunk ** 2))
        is_speech = rms > self.threshold
        confidence = min(1.0, rms / (self.threshold * 2))
        
        return is_speech, confidence
        return self.process_chunk(audio_chunk)
