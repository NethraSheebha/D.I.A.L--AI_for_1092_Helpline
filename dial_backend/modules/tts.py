import os
import io
import asyncio
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


# --- Main TTS synthesis function ---------------------------------------------

async def synthesize(intent: dict) -> bytes:
    """
    Converts text to speech using Microsoft Edge TTS neural voices.

    This is the voice that speaks back to the citizen during the call.

    Input: intent dict with keys:
        - language: "en", "kn", or "hi"
        - issue: the classified complaint type
        - location: extracted location or None
        - rephrase: True if this is a second attempt (optional)
        - escalating: True if handing off to human agent (optional)
        - _raw_text: if set, speak this text directly (bypasses templates)

    Output: MP3 audio bytes to be sent over WebSocket to the browser

    Returns empty bytes b"" on failure -- main.py handles this gracefully
    """
    lang = intent.get("language", "en")
    # Normalize language code -- faster-whisper returns full codes like "kannada"
    if lang in ("kannada", "kn-IN"):
        lang = "kn"
    elif lang in ("hindi", "hi-IN"):
        lang = "hi"
    elif lang not in VOICE_MAP:
        lang = "en"  # default to English if unknown

    voice = VOICE_MAP.get(lang, DEFAULT_VOICE)

    # If _raw_text is provided, use it directly instead of templates
    if intent.get("_raw_text"):
        text = intent["_raw_text"]
    elif intent.get("escalating"):
        text = ESCALATION_TEMPLATES.get(lang, ESCALATION_TEMPLATES["en"])
    elif intent.get("rephrase"):
        text = REPHRASE_TEMPLATES.get(lang, REPHRASE_TEMPLATES["en"])
    else:
        template = VERIFICATION_TEMPLATES.get(lang, VERIFICATION_TEMPLATES["en"])
        location = intent.get("location") or "your area"
        issue = intent.get("issue", "the issue")
        text = template.format(issue=issue, location=location)

    print(f"[TTS] Synthesizing | voice={voice} | text='{text[:60]}...'")

    if edge_tts is None:
        print("[TTS] Edge-TTS unavailable; returning empty audio")
        return b""

    try:
        # Edge-TTS streams audio chunks asynchronously.
        # We collect all chunks into a BytesIO buffer and return as bytes.
        communicate = edge_tts.Communicate(text=text, voice=voice)
        audio_buffer = io.BytesIO()

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                # Only write audio chunks, skip metadata chunks
                audio_buffer.write(chunk["data"])

        audio_buffer.seek(0)
        result = audio_buffer.read()

        if len(result) == 0:
            print(f"[TTS] Warning: empty audio returned for text='{text[:40]}'")
            return b""

        print(f"[TTS] Success | {len(result)} bytes | voice={voice}")
        return result

    except Exception as e:
        print(f"[TTS] Error: {type(e).__name__}: {e}")
        # Return empty bytes -- the WebSocket handler in main.py
        # checks for empty bytes and skips sending audio gracefully
        return b""


async def synthesize_text(text: str, lang: str = "en") -> bytes:
    """
    Helper function: synthesize any custom text directly.
    Used for custom messages not tied to the intent templates.
    Example: synthesize_text("Your complaint has been registered.", "kn")
    """
    return await synthesize({
        "language": lang,
        "issue": text,
        "location": "",
        "_raw_text": text
    })


# --- Backward-compatible class wrapper ---------------------------------------
# main.py imports CoquiTTS by class name. This wrapper delegates to the
# module-level synthesize() function so existing code doesn't break.

class CoquiTTS:
    def __init__(self, model_name: str = "edge-tts"):
        self.model_name = model_name

    async def initialize(self):
        print("[TTS] Edge-TTS ready (CoquiTTS wrapper active)")

    async def synthesize(self, intent: dict) -> bytes:
        return await synthesize(intent)

    async def generate_verification_summary(self, intent: str, entities: dict, language: str) -> bytes:
        return await synthesize_text(intent, language)
