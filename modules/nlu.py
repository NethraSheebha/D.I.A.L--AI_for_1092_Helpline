import os
import json
import asyncio
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini at module level — loads once, reused for every call
_api_key = os.getenv("GEMINI_API_KEY", "").strip()
gemini_client = genai.Client(api_key=_api_key) if _api_key else None
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_TIMEOUT = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "5"))

# --- Intent labels -----------------------------------------------------------
# These are the exact categories the system classifies citizen complaints into.
# Gemini is instructed to pick exactly one of these labels.
INTENT_LABELS = [
    "road damage or pothole",
    "water supply complaint",
    "electricity failure",
    "garbage or sanitation issue",
    "noise or public disturbance",
    "medical emergency",
    "police or safety concern",
    "government service complaint",
    "general inquiry",
    "unclear or mixed issue"
]

# --- Dialect signals ---------------------------------------------------------
# These keyword signals help identify which regional dialect the citizen
# is speaking. The profile accumulates hits across turns in the same call.
DIALECT_SIGNALS = {
    "dharwad_north":   [
        "ಏನ್ ಮಾಡ್ತಿ", "ನಮ್ ಊರಾಗ", "henge aithu", "yellidiya",
        "yenu maadtidiya", "haakidaare", "banni"
    ],
    "mysuru_south":    [
        "namma ooru", "ಹ್ಯಾಗಿದೆ", "samachara", "haege",
        "chennagide", "gottilla", "bartheeni"
    ],
    "coastal_tulu":    [
        "ಏನ್ ಮಾರಾಯ", "alva", "ulla", "yeno",
        "aitha", "ondhe", "maraya"
    ],
    "bangalore_urban": [
        "sir", "actually", "basically", "you know",
        "like", "means", "na"
    ],
    "hindi_belt":      [
        "bhaiya", "sahib", "ji", "haan", "theek hai",
        "nahi", "kya", "matlab"
    ],
}

# --- Keyword fallback classifier ---------------------------------------------
# Used when Gemini times out or fails. Fast and works on transliterated text.
KEYWORD_INTENT_MAP = {
    "road damage or pothole": [
        "pothole", "godda", "gundi", "hole in road", "road damage",
        "broken road", "road repair", "raste kharab", "rasta toda",
        "gadi beedhi", "road block"
    ],
    "water supply complaint": [
        "water", "paani", "neeru", "no water", "water supply",
        "water not coming", "dry tap", "neer illa", "water problem"
    ],
    "electricity failure": [
        "power", "electricity", "current", "light gone", "power cut",
        "no electricity", "blackout", "current illa", "light illa", "eb problem"
    ],
    "garbage or sanitation issue": [
        "garbage", "kasa", "waste", "dustbin", "smell", "sanitation",
        "cleaning", "trash not collected", "kachara", "swachha"
    ],
    "noise or public disturbance": [
        "noise", "sound", "loud", "disturbing", "party", "music loud",
        "shouting", "disturbance", "gonda"
    ],
    "medical emergency": [
        "accident", "injured", "hospital", "ambulance", "bleeding",
        "unconscious", "emergency", "hurt", "help injured", "aapada"
    ],
    "police or safety concern": [
        "police", "theft", "robbery", "stolen", "fight", "violence",
        "kalla", "thief", "unsafe", "danger", "chori"
    ],
    "government service complaint": [
        "office", "certificate", "ration", "pension", "government",
        "bribe", "corruption", "service not given", "hakku"
    ],
}


def keyword_classify(text: str) -> tuple:
    """
    Fast keyword-based pre-classifier.
    Used as fallback when Gemini is unavailable or times out.
    Returns (intent_label, confidence_score).
    """
    text_lower = text.lower()
    scores = {}
    for intent, keywords in KEYWORD_INTENT_MAP.items():
        hits = sum(1 for kw in keywords if kw in text_lower)
        if hits > 0:
            scores[intent] = hits
    if scores:
        best = max(scores, key=scores.get)
        # Confidence based on number of keyword hits — more hits = more confident
        confidence = min(0.55 + (scores[best] * 0.08), 0.82)
        print(f"[NLU] Keyword fallback: '{best}' ({confidence:.2f})")
        return best, confidence
    return "unclear or mixed issue", 0.1


# --- Dialect fingerprinting --------------------------------------------------

def update_dialect_profile(profile: dict, transcript_obj: dict) -> dict:
    """
    Updates the dialect profile for the current call session.
    Called after every turn — accumulates dialect signal hits across the call.
    The profile dict is stored in Redis and grows more accurate as the call progresses.

    Example: After 3 turns of Mysuru-dialect Kannada, profile will show
    {"mysuru_south": 4, "bangalore_urban": 1, ...} — dominant = mysuru_south
    """
    text = transcript_obj.get("text", "").lower()
    for dialect, signals in DIALECT_SIGNALS.items():
        hits = sum(1 for s in signals if s in text)
        profile[dialect] = profile.get(dialect, 0) + hits
    return profile


def get_dominant_dialect(profile: dict) -> str:
    """
    Returns the dialect with the highest accumulated score.
    Returns "standard" if no dialect signals have been detected yet.
    """
    if not profile or all(v == 0 for v in profile.values()):
        return "standard"
    return max(profile, key=profile.get)


# --- Main intent extraction using Gemini -------------------------------------

async def extract_intent(transcript_obj: dict, dialect_profile: dict) -> dict:
    """
    Extracts structured intent from citizen speech using Gemini API.

    Flow:
    1. Try Gemini with 5-second timeout
    2. If Gemini fails or times out -> fall back to keyword classifier
    3. Always return a valid dict with all required keys

    Returns:
    {
        "issue": str,        # one of INTENT_LABELS
        "confidence": float, # 0.0 to 1.0
        "location": str,     # extracted location or null
        "urgency": str,      # "high", "medium", or "low"
        "language": str,     # detected language code
        "dialect": str,      # dominant dialect from profile
        "raw_text": str      # original transcript
    }
    """
    text = transcript_obj.get("text", "").strip()
    lang = transcript_obj.get("lang", "en")
    dominant_dialect = get_dominant_dialect(dialect_profile)

    # Default fallback — returned if everything fails
    fallback = {
        "issue": "unclear or mixed issue",
        "confidence": 0.1,
        "location": None,
        "urgency": "low",
        "language": lang,
        "dialect": dominant_dialect,
        "raw_text": text
    }

    # If transcript is empty or too short, skip classification
    if len(text.split()) < 2:
        print(f"[NLU] Text too short to classify: '{text}'")
        return fallback

    # Build the Gemini prompt
    prompt = f"""You are an AI assistant for the Karnataka Government 1092 citizen helpline.
A citizen has called to report an issue. Analyze their complaint carefully.

Transcript: "{text}"
Detected language: {lang}
Caller dialect/region: {dominant_dialect}

Your task:
1. Classify the complaint into EXACTLY ONE of these categories:
{json.dumps(INTENT_LABELS, indent=2)}

2. Extract any specific location mentioned (area name, landmark, neighborhood, road name).

3. Assess urgency:
   - "high": life or safety risk (accident, medical emergency, violence, fire)
   - "medium": significant problem affecting daily life (no water, power cut, road damage)
   - "low": minor inconvenience or general inquiry

4. Estimate your confidence (0.0 to 1.0) in the classification.
   Be honest — if the complaint is unclear, set confidence low.

Respond with ONLY this JSON object. No explanation. No markdown. No backticks:
{{
  "issue": "<exact category string from the list above>",
  "confidence": <float 0.0 to 1.0>,
  "location": "<specific place mentioned or null>",
  "urgency": "<high or medium or low>"
}}"""

    try:
        if gemini_client is None:
            raise RuntimeError("Gemini client not initialized — check GEMINI_API_KEY in .env")

        # Run Gemini in executor to avoid blocking the async event loop
        def _call_gemini():
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return response.text

        loop = asyncio.get_event_loop()
        raw_response = await asyncio.wait_for(
            loop.run_in_executor(None, _call_gemini),
            timeout=GEMINI_TIMEOUT
        )

        # Clean the response — Gemini sometimes wraps JSON in backticks
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()

        # Parse the JSON response
        parsed = json.loads(cleaned)

        # Validate that issue is one of the allowed labels
        issue = parsed.get("issue", "unclear or mixed issue")
        if issue not in INTENT_LABELS:
            print(f"[NLU] Gemini returned unknown label '{issue}' — correcting to 'unclear or mixed issue'")
            issue = "unclear or mixed issue"

        result = {
            "issue": issue,
            "confidence": float(parsed.get("confidence", 0.5)),
            "location": parsed.get("location") or None,
            "urgency": parsed.get("urgency", "medium"),
            "language": lang,
            "dialect": dominant_dialect,
            "raw_text": text
        }

        print(f"[NLU] Gemini -> issue='{result['issue']}' | confidence={result['confidence']:.2f} | location='{result['location']}' | urgency={result['urgency']}")
        return result

    except asyncio.TimeoutError:
        print(f"[NLU] Gemini timeout after {GEMINI_TIMEOUT}s — using keyword fallback")
        kw_intent, kw_conf = keyword_classify(text)
        return {**fallback, "issue": kw_intent, "confidence": kw_conf}

    except json.JSONDecodeError as e:
        print(f"[NLU] JSON parse error: {e} | Raw response: {raw_response[:100]}")
        kw_intent, kw_conf = keyword_classify(text)
        return {**fallback, "issue": kw_intent, "confidence": kw_conf}

    except Exception as e:
        print(f"[NLU] Gemini error: {type(e).__name__}: {e}")
        kw_intent, kw_conf = keyword_classify(text)
        return {**fallback, "issue": kw_intent, "confidence": kw_conf}


# --- Backward-compatible class wrappers --------------------------------------
# main.py currently imports these classes. They delegate to the module-level
# functions above so the existing code doesn't break.

class IndicBERTIntentExtractor:
    def __init__(self):
        self.intent_labels = INTENT_LABELS

    async def initialize(self):
        print("[NLU] IndicBERTIntentExtractor -> Gemini backend ready")

    async def extract_intent(self, transcript: str, language: str) -> dict:
        transcript_obj = {"text": transcript, "lang": language}
        return await extract_intent(transcript_obj, {})


class DialectFingerprinter:
    def __init__(self):
        self.profile = {}

    async def analyze_dialect(self, transcript: str, language: str) -> dict:
        transcript_obj = {"text": transcript, "lang": language}
        self.profile = update_dialect_profile(self.profile, transcript_obj)
        dominant = get_dominant_dialect(self.profile)
        total = sum(self.profile.values())
        confidence = self.profile.get(dominant, 0) / max(1, total)
        return {
            "dialect": dominant,
            "confidence": min(1.0, confidence),
            "profile": self.profile
        }

    def add_sample(self, transcript: str, language: str, detected_dialect: str):
        update_dialect_profile(self.profile, {"text": transcript})

    def get_session_fingerprint(self) -> dict:
        return {
            "dominant_dialect": get_dominant_dialect(self.profile),
            "profile": self.profile
        }


class IndicTrans2Translator:
    def __init__(self):
        self.model = None

    async def initialize(self):
        pass

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        return text
