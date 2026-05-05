from __future__ import annotations

import asyncio
import json
import time
from typing import Dict, List, Optional

import librosa
import numpy as np
import redis.asyncio as redis


class AcousticAnalyticsWorker:
    """
    Real-time acoustic analytics worker for voice AI calls.
    Processes 16kHz 16-bit mono PCM streams from Redis Pub/Sub.
    Calculates metrics in 500ms sliding windows and flags call states.
    """

    SAMPLE_RATE = 16000
    WINDOW_SIZE_MS = 500
    WINDOW_SIZE_SAMPLES = int(SAMPLE_RATE * WINDOW_SIZE_MS / 1000)  # 8000 samples

    # Thresholds (tunable)
    VOLUME_RMS_HIGH = 0.8  # Screaming
    VOLUME_RMS_LOW = 0.05  # Mumbling
    PITCH_SPIKE_THRESHOLD = 400  # Hz, high pitch spike
    ZCR_NOISE_THRESHOLD = 0.15  # High background noise
    WPM_FAST_THRESHOLD = 200  # Words per minute

    EMERGENCY_KEYWORDS = {"help", "emergency", "panic", "danger", "fire", "accident"}

    def __init__(
        self,
        redis_host: str = "localhost",
        redis_port: int = 6379,
        redis_db: int = 0,
    ) -> None:
        self.redis_host = redis_host
        self.redis_port = redis_port
        self.redis_db = redis_db
        self.redis_client: Optional[redis.Redis] = None
        self.audio_buffers: Dict[str, np.ndarray] = {}  # call_id -> audio buffer
        self.last_wpm_calc: Dict[str, float] = {}  # call_id -> last WPM
        self.last_transcript_len: Dict[str, int] = {}  # call_id -> last word count

    async def start(self) -> None:
        """Initialize Redis connection and start processing."""
        self.redis_client = redis.Redis(
            host=self.redis_host,
            port=self.redis_port,
            db=self.redis_db,
            decode_responses=False,  # For binary PCM data
        )

        pubsub = self.redis_client.pubsub()
        await pubsub.subscribe("audio_stream_b")

        print("AcousticAnalyticsWorker started, listening on 'audio_stream_b'")

        async for message in pubsub.listen():
            if message["type"] == "message":
                await self._process_audio_message(message["data"])

    async def _process_audio_message(self, data: bytes) -> None:
        """Process incoming audio message from Redis."""
        try:
            # Assume message is JSON with call_id and pcm_bytes
            message = json.loads(data.decode("utf-8"))
            call_id = message["call_id"]
            pcm_bytes = bytes.fromhex(message["pcm_bytes"])  # Assume hex-encoded for JSON

            await self._update_buffer(call_id, pcm_bytes)
            await self._analyze_and_publish(call_id)

        except Exception as e:
            print(f"Error processing audio message: {e}")

    async def _update_buffer(self, call_id: str, pcm_bytes: bytes) -> None:
        """Update the sliding audio buffer for the call."""
        samples = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0

        if call_id not in self.audio_buffers:
            self.audio_buffers[call_id] = np.zeros(self.WINDOW_SIZE_SAMPLES, dtype=np.float32)

        # Append new samples and keep only the last WINDOW_SIZE_SAMPLES
        self.audio_buffers[call_id] = np.concatenate([self.audio_buffers[call_id], samples])
        if len(self.audio_buffers[call_id]) > self.WINDOW_SIZE_SAMPLES:
            self.audio_buffers[call_id] = self.audio_buffers[call_id][-self.WINDOW_SIZE_SAMPLES:]

    async def _analyze_and_publish(self, call_id: str) -> None:
        """Analyze the current buffer and publish flags."""
        if len(self.audio_buffers[call_id]) < self.WINDOW_SIZE_SAMPLES:
            return  # Not enough data yet

        audio = self.audio_buffers[call_id]

        # Calculate metrics
        volume_rms = self._calculate_volume_rms(audio)
        pitch_jitter = self._calculate_pitch_jitter(audio)
        clarity_zcr = self._calculate_clarity_zcr(audio)
        speech_speed_wpm = await self._calculate_speech_speed(call_id)

        # Determine label and reason
        label, reason = self._determine_label(
            volume_rms, pitch_jitter, clarity_zcr, speech_speed_wpm, call_id
        )

        # Publish to Redis
        flag_data = {
            "call_id": call_id,
            "label": label,
            "reason": reason,
            "metrics": {
                "volume_rms": volume_rms,
                "pitch_jitter": pitch_jitter,
                "clarity_zcr": clarity_zcr,
                "speech_speed_wpm": speech_speed_wpm,
            },
            "timestamp": time.time(),
        }

        await self.redis_client.publish("call_flags", json.dumps(flag_data).encode("utf-8"))

    def _calculate_volume_rms(self, audio: np.ndarray) -> float:
        """Calculate RMS volume."""
        return np.sqrt(np.mean(audio**2))

    def _calculate_pitch_jitter(self, audio: np.ndarray) -> float:
        """Calculate pitch jitter using librosa.yin."""
        f0, voiced_flag, voiced_probs = librosa.pyin(
            audio,
            fmin=librosa.note_to_hz("C2"),
            fmax=librosa.note_to_hz("C7"),
            sr=self.SAMPLE_RATE,
        )
        # Simple jitter: std of voiced pitches
        voiced_f0 = f0[voiced_flag]
        return np.std(voiced_f0) if len(voiced_f0) > 0 else 0.0

    def _calculate_clarity_zcr(self, audio: np.ndarray) -> float:
        """Calculate Zero-Crossing Rate for clarity/noise."""
        return librosa.feature.zero_crossing_rate(audio)[0].mean()

    async def _calculate_speech_speed(self, call_id: str) -> float:
        """Calculate Words Per Minute from partial transcript."""
        try:
            transcript = await self.redis_client.get(f"partial_stt:{call_id}")
            if transcript:
                transcript = transcript.decode("utf-8")
                word_count = len(transcript.split())
                current_time = time.time()

                if call_id in self.last_wpm_calc:
                    time_diff = current_time - self.last_wpm_calc[call_id]
                    word_diff = word_count - self.last_transcript_len.get(call_id, 0)
                    if time_diff > 0:
                        wpm = (word_diff / time_diff) * 60
                    else:
                        wpm = 0
                else:
                    wpm = 0

                self.last_wpm_calc[call_id] = current_time
                self.last_transcript_len[call_id] = word_count
                return wpm
            else:
                return 0.0
        except Exception as e:
            print(f"Error calculating speech speed: {e}")
            return 0.0

    def _determine_label(
        self,
        volume_rms: float,
        pitch_jitter: float,
        clarity_zcr: float,
        speech_speed_wpm: float,
        call_id: str,
    ) -> tuple[str, str]:
        """Determine the call label based on metrics."""
        reasons = []

        # Volume checks
        if volume_rms > self.VOLUME_RMS_HIGH:
            reasons.append("High volume (screaming)")
        elif volume_rms < self.VOLUME_RMS_LOW:
            reasons.append("Low volume (mumbling)")

        # Pitch checks
        if pitch_jitter > self.PITCH_SPIKE_THRESHOLD:
            reasons.append("High pitch jitter (panic)")

        # Clarity checks
        if clarity_zcr > self.ZCR_NOISE_THRESHOLD:
            reasons.append("High zero-crossing rate (background noise)")

        # Speech speed
        if speech_speed_wpm > self.WPM_FAST_THRESHOLD:
            reasons.append("Fast speech (>200 WPM)")

        # Emergency keywords (placeholder - would need transcript analysis)
        # For now, assume checked elsewhere or add logic here

        if any("panic" in r or "screaming" in r for r in reasons):
            return "RED", "; ".join(reasons)
        elif reasons:
            return "YELLOW", "; ".join(reasons)
        else:
            return "GREEN", "Normal"


async def main():
    """Run the acoustic analytics worker."""
    worker = AcousticAnalyticsWorker()
    await worker.start()


if __name__ == "__main__":
    asyncio.run(main())
