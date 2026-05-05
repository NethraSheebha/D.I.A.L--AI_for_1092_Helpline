from typing import Dict, Optional
import numpy as np
import asyncio
import torch

class PyannoteAcousticSentiment:
    def __init__(self):
        self.model = None
        self.emotion_classes = ["calm", "confused", "urgent", "distressed", "panicked"]
        
    async def initialize(self):
        pass
    
    def _compute_acoustic_features(self, audio_bytes: bytes) -> Dict:
        try:
            audio = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            
            if len(audio) < 8000:
                return {"ipl": 1, "label": "calm", "stress_score": 0.0, "features": {}}
            
            # Zero Crossing Rate
            zero_crossings = np.abs(np.diff(np.signbit(audio).astype(int))).sum()
            zcr = zero_crossings / len(audio)
            zcr_norm = np.clip(zcr / 0.15, 0, 1)
            
            # RMS Energy
            rms = np.sqrt(np.mean(audio ** 2))
            rms_norm = np.clip(rms / 0.3, 0, 1)
            
            # Spectral Centroid approximation via RMS of high frequencies
            fft_vals = np.abs(np.fft.fft(audio[:8000]))
            freqs = np.fft.fftfreq(len(audio[:8000]), d=1/16000)
            if len(freqs) > 0 and len(fft_vals) > 0:
                centroid = np.sum(np.abs(freqs) * fft_vals) / np.sum(fft_vals)
                centroid = np.abs(centroid)
            else:
                centroid = 2000
            
            centroid_norm = np.clip((centroid - 500) / 3500, 0, 1)
            
            stress_score = (0.4 * zcr_norm) + (0.3 * rms_norm) + (0.3 * centroid_norm)
            
            if stress_score < 0.2:
                ipl = 1
                label = "calm"
            elif stress_score < 0.4:
                ipl = 2
                label = "confused"
            elif stress_score < 0.6:
                ipl = 3
                label = "urgent"
            elif stress_score < 0.8:
                ipl = 4
                label = "distressed"
            else:
                ipl = 5
                label = "panicked"
            
            return {
                "ipl": ipl,
                "label": label,
                "stress_score": float(stress_score),
                "features": {
                    "zcr": float(zcr_norm),
                    "rms": float(rms_norm),
                    "centroid": float(centroid_norm)
                }
            }
        except Exception as e:
            print(f"❌ Sentiment error: {str(e)[:50]}")
            return {"ipl": 1, "label": "calm", "stress_score": 0.0, "features": {}}
    
    async def score_sentiment(self, audio_bytes: bytes) -> Dict:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._compute_acoustic_features, audio_bytes)
    
    async def analyze_chunk(self, audio_chunk: np.ndarray) -> Dict:
        audio_bytes = audio_chunk.astype(np.int16).tobytes()
        result = await self.score_sentiment(audio_bytes)
        return {
            "emotion": result["label"],
            "ipl": result["ipl"],
            "confidence": result["stress_score"],
            "scores": {e: 0.2 for e in self.emotion_classes}
        }
    
    async def analyze_stream(self, audio_chunks: list) -> Dict:
        if not audio_chunks:
            return {"emotion": "calm", "ipl": 1, "confidence": 0.5}
        
        audio_data = np.concatenate(audio_chunks)
        return await self.analyze_chunk(audio_data)
