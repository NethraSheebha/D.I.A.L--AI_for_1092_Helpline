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


# Global initialization function called by FastAPI lifespan
async def initialize_tts():
    print("[TTS] Initializing Indic-Parler model...")
    return IndicParlerTTS()
