import numpy as np

class AcousticAnalytics:
    """
    Stream B: Real-time audio analytics (Volume, Stress, Vitals).
    Performs fast mathematical analysis on audio chunks to detect call health.
    """
    
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate

    def process_chunk(self, pcm_bytes: bytes) -> dict:
        """
        Calculate vitals for a single audio chunk.
        This runs in parallel with Stream A (STT).
        """
        if not pcm_bytes or len(pcm_bytes) < 2:
            return {"volume_rms": 0, "urgency": "LOW", "peak": 0}
            
        try:
            # Convert to numpy array
            samples = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32)
            
            # 1. Calculate RMS Volume (Root Mean Square)
            rms = np.sqrt(np.mean(samples**2)) if len(samples) > 0 else 0
            
            # 2. Determine Urgency/Stress (Threshold-based)
            # These values are calibrated for standard 16-bit PCM audio
            urgency = "LOW"
            if rms > 4000:
                urgency = "HIGH"  # Shouting/Panic
            elif rms > 1500:
                urgency = "MEDIUM" # Active/Normal speech
                
            return {
                "volume_rms": round(float(rms), 2),
                "urgency": urgency,
                "peak": int(np.max(np.abs(samples))) if len(samples) > 0 else 0
            }
        except Exception as e:
            print(f"[Analytics] Error processing chunk: {e}")
            return {"volume_rms": 0, "urgency": "LOW", "peak": 0}
