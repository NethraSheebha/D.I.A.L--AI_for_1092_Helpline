import os
import io
import asyncio
import re
from typing import Iterator, List

import numpy as np
import soundfile as sf
from transformers import pipeline
from dotenv import load_dotenv

try:
    import edge_tts
except ImportError:
    edge_tts = None

load_dotenv()

# --- Voice mapping -----------------------------------------------------------
# Maps language codes to Microsoft neural TTS voices.
# These are Indian-accented voices specifically designed for Indian languages.
# kn-IN-SapnaNeural  -- Native Kannada female voice
# hi-IN-SwaraNeural  -- Native Hindi female voice
# en-IN-NeerjaNeural -- Indian English female voice
VOICE_MAP = {
    "kn": "kn-IN-SapnaNeural",
    "hi": "hi-IN-SwaraNeural",
    "en": "en-IN-NeerjaNeural",
}
DEFAULT_VOICE = "en-IN-NeerjaNeural"

# --- Verification templates --------------------------------------------------
# These are the phrases the AI speaks back to the citizen to verify understanding.
# The citizen hears this and responds "yes" or "no".
VERIFICATION_TEMPLATES = {
    "en": "You are reporting {issue} near {location}. Is that correct?",
    "kn": "{location} ಹತ್ತಿರ {issue} ಬಗ್ಗೆ ದೂರು ನೀಡುತ್ತಿದ್ದೀರಿ. ಅದು ಸರಿಯೇ?",
    "hi": "आप {location} के पास {issue} की शिकायत कर रहे हैं। क्या यह सही है?",
}

# --- Rephrase templates ------------------------------------------------------
# Used on the second attempt when the first verification failed.
# Simpler language to help the citizen understand and re-confirm.
REPHRASE_TEMPLATES = {
    "en": "I'm sorry, I did not understand. Could you please tell me again — what is the problem and where exactly?",
    "kn": "ಕ್ಷಮಿಸಿ, ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ — ಸಮಸ್ಯೆ ಏನು ಮತ್ತು ಎಲ್ಲಿ?",
    "hi": "माफ करें, मुझे समझ नहीं आया। कृपया फिर से बताएं — समस्या क्या है और कहां है?",
}

# --- Escalation message ------------------------------------------------------
# Played to citizen before transferring to a human agent.
ESCALATION_TEMPLATES = {
    "en": "I am connecting you to a helpline officer who will assist you right away.",
    "kn": "ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ನಾನು ನಿಮ್ಮನ್ನು ಸಿಬ್ಬಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತಿದ್ದೇನೆ.",
    "hi": "मैं आपको एक अधिकारी से जोड़ रहा हूं जो आपकी मदद करेगा।",
}


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
        try:
            if model_name != "fallback":
                # Ensure we don't crash if the model is gated/restricted
                self.pipeline = pipeline(
                    task="text-to-speech",
                    model=self.model_name,
                    device=self.device,
                    trust_remote_code=True
                )
            else:
                self.pipeline = None
        except Exception as e:
            print(f"[TTS] Warning: Could not load local TTS model '{model_name}': {e}")
            print("[TTS] Continuing with Edge-TTS fallback.")
            self.pipeline = None
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

    async def synthesize(self, text_chunk: str, language: str = "en") -> bytes:
        """Convert a textual segment into raw PCM audio bytes with Edge-TTS fallback."""
        try:
            # Try the IndicParler local model first if pipeline is loaded
            if hasattr(self, 'pipeline') and self.pipeline is not None:
                output = self.pipeline(text_chunk)
                audio = output["audio"] if isinstance(output, dict) else output
                audio_array = audio.array if hasattr(audio, "array") else audio
                return self._float32_to_int16(audio_array).tobytes()
        except Exception as e:
            print(f"[TTS] Local model failed/gated: {e}. Falling back to Edge-TTS.")

        # Fallback to Edge-TTS
        if edge_tts:
            voice = VOICE_MAP.get(language, DEFAULT_VOICE)
            communicate = edge_tts.Communicate(text_chunk, voice)
            
            # Write to a buffer to avoid disk I/O
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            
            if audio_data:
                # Edge-TTS returns MP3/Opus usually, we need to convert to PCM 16kHz Mono
                # For the demo, we'll try to return the bytes as is if the client can handle them,
                # but main.py expects PCM. Let's use pydub to convert if available.
                try:
                    from pydub import AudioSegment
                    import io
                    song = AudioSegment.from_file(io.BytesIO(audio_data), format="mp3")
                    song = song.set_frame_rate(16000).set_channels(1).set_sample_width(2)
                    return song.raw_data
                except Exception as ex:
                    print(f"[TTS] Pydub conversion failed: {ex}. Returning raw MP3.")
                    return audio_data
        
        return b""

    def _float32_to_int16(self, audio: np.ndarray) -> np.ndarray:
        clipped = np.clip(audio, -1.0, 1.0)
        return (clipped * 32767).astype(np.int16)


# Global initialization function called by FastAPI lifespan
async def initialize_tts():
    print("[TTS] Initializing TTS system...")
    try:
        return IndicParlerTTS()
    except Exception as e:
        print(f"[TTS] IndicParlerTTS init failed: {e}. Using Edge-TTS fallback only.")
        # Return a dummy object that still has the synthesize method
        class FallbackTTS:
            async def synthesize(self, text, language="en"):
                # We'll just call the static method logic or similar
                # For now, let's just make IndicParlerTTS robust to init failure
                pass
        return IndicParlerTTS(model_name="fallback")
