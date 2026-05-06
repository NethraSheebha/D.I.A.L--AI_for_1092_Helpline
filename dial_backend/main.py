import asyncio
import os
from contextlib import asynccontextmanager
from typing import Optional, List
from datetime import datetime, timedelta
import json
import uuid
import numpy as np
import logging
import time

from fastapi import FastAPI, WebSocket, HTTPException, WebSocketDisconnect, APIRouter, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import redis.asyncio as aioredis
from google import genai
from dotenv import load_dotenv

from modules.vad import SileroVAD, ChunkBuffer
from modules.stt import IndicConformerSTT, initialize_stt
from modules.acoustic_analytics import AcousticAnalytics
from modules.nlu import IndicBERTIntentExtractor, IndicTrans2Translator, DialectFingerprinter
from modules.sentiment import PyannoteAcousticSentiment
from modules.tts import IndicParlerTTS, initialize_tts
from modules.confidence import ConfidenceScorer
import modules.store as store

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("dial_backend")

# Pydantic models for API requests/responses
class AgentIntentCorrection(BaseModel):
    turn_id: str
    corrected_intent: dict

class AgentEscalationRequest(BaseModel):
    reason: str

class TurnResponse(BaseModel):
    turn_id: str
    turn_number: int
    transcript: str
    detected_lang: Optional[str] = None
    intent_raw: dict
    sentiment_raw: dict
    confidence: float
    citizen_confirmed: Optional[str] = None
    agent_corrected: Optional[bool] = None
    corrected_intent: Optional[dict] = None

class CallContextResponse(BaseModel):
    call_id: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    total_turns: int = 0
    outcome: str = "active"
    turns: List[TurnResponse] = []
    escalation: Optional[dict] = None

class CallSummary(BaseModel):
    call_id: str
    started_at: Optional[datetime] = None
    total_turns: int = 0
    outcome: str
    last_transcript: Optional[str] = None

class LatestCallsResponse(BaseModel):
    calls: List[CallSummary]

class StatsResponse(BaseModel):
    total_calls: int = 0
    resolved_calls: int = 0
    escalated_calls: int = 0
    failed_calls: int = 0
    resolution_rate: float = 0.0
    escalation_rate: float = 0.0
    avg_turns_per_call: float = 0.0
    languages_detected: dict = {}
    intents_distribution: dict = {}
    sentiment_distribution: dict = {}

# Global variables
redis_client: Optional[aioredis.Redis] = None
vad: Optional[SileroVAD] = None
# Note: STT and Analytics are now instantiated per-call in call_ws


async def redis_setex(key: str, ex: int, value: str):
    if redis_client:
        try:
            await redis_client.setex(key, ex, value)
        except:
            pass


async def redis_get(key: str) -> Optional[str]:
    if redis_client:
        try:
            return await redis_client.get(key)
        except:
            pass
    return None


async def redis_delete(key: str):
    if redis_client:
        try:
            await redis_client.delete(key)
        except:
            pass


async def get_session_from_call_id(call_id: str) -> Optional[dict]:
    """Retrieve session from Redis by call_id"""
    session_data = await redis_get(f"session:{call_id}")
    if session_data:
        try:
            if isinstance(session_data, bytes):
                session_data = session_data.decode()
            return json.loads(session_data)
        except:
            pass
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("+--------------------------------------------------+")
    print("|           D.I.A.L. Backend v1.0                  |")
    print("|   Models: Whisper-medium | Gemini-Flash | Edge-TTS |")
    print("+--------------------------------------------------+")
    # Gemini configuration is handled in modules/nlu.py
    # genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    print("[STARTUP] Gemini SDK ready")
    
    global redis_client
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        redis_client = await aioredis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)
        await redis_client.ping()
        logger.info("✅ Redis connected")
    except Exception as e:
        logger.warning(f"⚠️ Redis unavailable: {str(e)[:40]} - Session persistence disabled")
        redis_client = None
    
    try:
        await store.init_db()
        logger.info("✅ PostgreSQL connected")
    except Exception as e:
        logger.error(f"❌ PostgreSQL error: {str(e)[:100]}")
    
    global vad, nlu_intent, sentiment, tts, confidence_scorer, dialect_fp
    
    try:
        vad = SileroVAD(threshold=float(os.getenv("VAD_THRESHOLD", 0.5)))
        await vad.initialize()
        logger.info("✅ VAD model loaded")
    except Exception as e:
        logger.error(f"❌ VAD initialization failed: {str(e)[:100]}")
        vad = None
    
    try:
        # Note: We now use IndicConformerSTT which will be instantiated per-call
        # but we initialize the model pipeline here to warm up the cache
        await initialize_stt()
        logger.info("✅ STT model initialized (Pipeline warmed up)")
    except Exception as e:
        logger.error(f"❌ STT initialization failed: {str(e)[:100]}")
    
    try:
        nlu_intent = IndicBERTIntentExtractor()
        await nlu_intent.initialize()
        logger.info("✅ NLU model loaded")
    except Exception as e:
        logger.error(f"❌ NLU initialization failed: {str(e)[:100]}")
        nlu_intent = None
    
    try:
        sentiment = PyannoteAcousticSentiment()
        await sentiment.initialize()
        logger.info("✅ Sentiment model loaded")
    except Exception as e:
        logger.error(f"❌ Sentiment initialization failed: {str(e)[:100]}")
        sentiment = None
    
    try:
        dialect_fp = DialectFingerprinter()
        logger.info("✅ Dialect fingerprinter loaded")
    except Exception as e:
        logger.error(f"❌ Dialect fingerprinter initialization failed: {str(e)[:100]}")
        dialect_fp = None
    
    try:
        await initialize_tts()
        logger.info("✅ TTS model initialized (Pipeline warmed up)")
    except Exception as e:
        logger.error(f"❌ TTS initialization failed: {str(e)[:100]}")

    
    try:
        confidence_scorer = ConfidenceScorer()
        await confidence_scorer.initialize()
        logger.info("✅ Confidence scorer loaded")
    except Exception as e:
        logger.error(f"❌ Confidence scorer initialization failed: {str(e)[:100]}")
        confidence_scorer = None
    
    logger.info("✅ All systems ready!")
    
    yield
    
    logger.info("🛑 Shutting down D.I.A.L Backend...")
    if redis_client:
        try:
            await redis_client.close()
            logger.info("✅ Redis disconnected")
        except Exception as e:
            logger.error(f"Error closing Redis: {str(e)[:100]}")
    
    try:
        await store.close_db()
        logger.info("✅ PostgreSQL disconnected")
    except Exception as e:
        logger.error(f"Error closing PostgreSQL: {str(e)[:100]}")
    
    logger.info("✅ Shutdown complete")



app = FastAPI(
    title="D.I.A.L Backend",
    description="Dialect-aware Intent-verified Assist Line for Karnataka 1092 Helpline",
    version="0.0.1",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests and responses"""
    start_time = time.time()
    
    # Skip logging for health checks to reduce noise
    if request.url.path in ["/", "/health/full"]:
        response = await call_next(request)
        return response
    
    method = request.method
    path = request.url.path
    
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        
        logger.info(
            "HTTP_REQUEST",
            extra={
                "method": method,
                "path": path,
                "status_code": response.status_code,
                "duration_ms": f"{process_time:.2f}",
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        return response
    except Exception as e:
        process_time = (time.time() - start_time) * 1000
        logger.error(
            f"HTTP_REQUEST_ERROR: {method} {path} failed after {process_time:.2f}ms - {str(e)[:100]}"
        )
        raise


@app.get("/")
async def health_check():
    return {
        "status": "ok",
        "service": "DIAL Backend"
    }


@app.get("/health/full")
async def health_check_full():
    """Full health check with all component status"""
    components = {
        "vad": {
            "status": "ready" if vad is not None else "not_loaded",
            "model": "SileroVAD" if vad else None,
            "threshold": float(os.getenv("VAD_THRESHOLD", 0.5)) if vad else None
        },
        "stt": {
            "status": "ready" if initialize_stt is not None else "not_loaded",
            "model": "ai4bharat/indic-conformer-600m-multilingual",
            "device": "cpu"
        },
        "nlu_intent": {
            "status": "ready" if nlu_intent is not None else "not_loaded",
            "model": "Gemini 1.5 Flash" if nlu_intent else None
        },
        "sentiment": {
            "status": "ready" if sentiment is not None else "not_loaded",
            "model": "PyannoteAcoustic" if sentiment else None
        },
        "tts": {
            "status": "ready" if initialize_tts is not None else "not_loaded",
            "model_name": "ai4bharat/indic-parler-tts",
            "device": "cpu"
        },
        "confidence": {
            "status": "ready" if confidence_scorer is not None else "not_loaded",
            "model": "ConfidenceScorer" if confidence_scorer else None
        },
        "dialect": {
            "status": "ready" if dialect_fp is not None else "not_loaded",
            "model": "DialectFingerprinter" if dialect_fp else None
        },
        "redis": {
            "status": "connected" if redis_client is not None else "unavailable",
            "url": os.getenv("REDIS_URL", "redis://localhost:6379") if redis_client else None,
            "optional": True
        },
        "postgresql": {
            "status": "connected" if store.pool is not None else "unavailable",
            "url": os.getenv("DATABASE_URL", "postgresql://localhost/dial") if store.pool else None
        }
    }
    
    # Calculate overall status
    critical_components = ["vad", "stt", "nlu_intent", "sentiment", "tts", "confidence", "dialect", "postgresql"]
    all_ready = all(
        components[comp]["status"] in ["ready", "connected"] 
        for comp in critical_components
    )
    
    return {
        "status": "fully_operational" if all_ready else "degraded" if all(
            components[comp]["status"] in ["ready", "connected", "unavailable", "not_loaded"]
            for comp in critical_components
        ) else "error",
        "timestamp": datetime.utcnow().isoformat(),
        "components": components,
        "summary": {
            "total": len(components),
            "ready": sum(1 for c in components.values() if c["status"] in ["ready", "connected"]),
            "unavailable": sum(1 for c in components.values() if c["status"] in ["unavailable", "not_loaded"])
        }
    }


@app.get("/api/call/{call_id}/history")
async def get_call_history(call_id: str):
    context = await store.get_call_context(call_id)
    turns = context.get("turns", [])
    return {
        "call_id": call_id,
        "interactions": turns,
        "total": len(turns)
    }


@app.get("/api/dashboard/summary")
async def get_dashboard_summary(
    agent_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    return {
        "total_calls": 0,
        "resolved": 0,
        "escalated": 0,
        "avg_duration": 0
    }


@app.post("/api/interaction/{interaction_id}/resolve")
async def resolve_interaction(interaction_id: int, resolution: dict):
    return {"status": "resolved", "interaction_id": interaction_id}


@app.websocket("/ws/call")
async def call_ws(websocket: WebSocket):
    await websocket.accept()
    call_id = str(uuid.uuid4())
    logger.info(f"[{call_id}] New WebSocket connection established")
    
    # Initialize per-session engines
    stt_engine = IndicConformerSTT(device="cpu")
    analytics_engine = AcousticAnalytics()
    
    audio_buffer = bytearray()
    chunk_buffer = ChunkBuffer()
    session = {
        "call_id": call_id,
        "dialect_profile": {},
        "attempt": 0,
        "turn_number": 0,
        "last_transcript": "",
        "last_intent": {},
        "last_sentiment": {},
        "last_turn_id": None,
        "started_at": datetime.utcnow().isoformat()
    }

    try:
        await store.create_call(call_id)
        await redis_setex(f"session:{call_id}", 3600, json.dumps(session))
        logger.info(f"[{call_id}] WebSocket session initialized in database")

        try:
            while True:
                logger.debug(f"[{call_id}] Waiting for data...")
                data = await websocket.receive()
                
                if "text" in data:
                    try:
                        msg = json.loads(data["text"])
                        logger.info(f"[{call_id}] Received JSON message: type={msg.get('type')}")
                        
                        if msg.get("type") == "confirm":
                            await handle_confirmation(websocket, session, msg.get("result"))
                        elif msg.get("type") == "force_process":
                            if len(audio_buffer) > 0:
                                logger.info(f"[{call_id}] Force processing {len(audio_buffer)} bytes")
                                await process_turn(websocket, session, bytes(audio_buffer))
                                audio_buffer.clear()
                    except json.JSONDecodeError as e:
                        logger.error(f"[{call_id}] JSON decode error: {type(e).__name__}: {str(e)[:100]}")
                
                elif "bytes" in data:
                    message = data["bytes"]
                    logger.debug(f"[{call_id}] Received audio data: {len(message)} bytes")
                    
                    # --- BROADCAST SYSTEM (FAN-OUT) ---
                    # 1. Stream A: Incremental STT
                    partial_text = stt_engine.append_pcm(message)
                    
                    # 2. Stream B: Real-time Analytics
                    vitals = analytics_engine.process_chunk(message)
                    
                    # 3. Push to Dashboard/Frontend immediately
                    await websocket.send_json({
                        "type": "partial",
                        "text": partial_text,
                        "vitals": vitals
                    })
                    
                    if redis_client:
                        await redis_client.publish(
                            f"call_vitals:{call_id}", 
                            json.dumps({"vitals": vitals, "call_id": call_id})
                        )

                    # 4. Standard VAD-based segmenting for the "Brain" (LLM/TTS)
                    audio_buffer.extend(message)
                    chunk = chunk_buffer.get_chunk()
                    if chunk is None:
                        chunk_buffer.add(message)
                        chunk = chunk_buffer.get_chunk()
                    
                    if chunk is not None:
                        try:
                            is_speech, vad_confidence = vad.process_chunk(chunk)
                            if not is_speech and len(audio_buffer) > 6400:
                                logger.info(f"[{call_id}] Silence detected, finalizing segment")
                                await websocket.send_json({"type": "state", "state": "processing"})
                                
                                # Finalize the STT segment
                                final_text = stt_engine.finalize_segment()
                                await process_turn(websocket, session, final_text, bytes(audio_buffer))
                                audio_buffer.clear()
                        except Exception as e:
                            logger.error(f"[{call_id}] VAD/Processing error: {str(e)[:100]}")
                            
                elif "type" in data and data["type"] == "websocket.disconnect":
                    logger.info(f"[{call_id}] WebSocket disconnect received")
                    raise WebSocketDisconnect(data.get("code", 1000))

        except WebSocketDisconnect:
            logger.info(f"[{call_id}] WebSocket disconnected gracefully")
            await redis_delete(f"session:{call_id}")
        except Exception as e:
            logger.error(f"[{call_id}] WebSocket error in receive loop: {type(e).__name__}: {str(e)[:100]}")
            import traceback
            logger.error(f"[{call_id}] Traceback: {traceback.format_exc()[:500]}")
            await redis_delete(f"session:{call_id}")
    
    except Exception as e:
        logger.error(f"[{call_id}] WebSocket initialization error: {type(e).__name__}: {str(e)[:100]}")
        await redis_delete(f"session:{call_id}")



async def process_turn(websocket: WebSocket, session: dict, transcript_text: str, audio_bytes: bytes):
    session["turn_number"] += 1
    logger.info(f"[{session['call_id']}] Processing turn {session['turn_number']} with transcript: '{transcript_text[:50]}'")
    tts_engine = IndicParlerTTS(device="cpu")

    sentiment_val = None
    try:
        # We only need to gather the sentiment now, as transcript is provided
        sentiment_val = await sentiment.score_sentiment(audio_bytes)
        logger.info(f"[{session['call_id']}] Sentiment: {sentiment_val}")
    except Exception as e:
        logger.error(f"[{session['call_id']}] Sentiment processing error: {type(e).__name__}: {str(e)[:100]}")
        sentiment_val = {"label": "unknown", "ipl": 1}

    session["last_transcript"] = transcript_text
    session["last_sentiment"] = sentiment_val

    detected_lang = "kn" # Default to Kannada for Indic-Conformer
    logger.info(f"[{session['call_id']}] Processing transcript: '{transcript_text[:50]}'")

    # Dialect analysis with error handling
    dialect_result = {"dialect": "unknown", "profile": {}}
    try:
        dialect_result = await dialect_fp.analyze_dialect(transcript_text, detected_lang)
        session["dialect_profile"].update(dialect_result.get("profile", {}))
        logger.info(f"[{session['call_id']}] Dialect: {dialect_result.get('dialect', 'unknown')}")
    except Exception as e:
        logger.error(f"[{session['call_id']}] Dialect analysis failed: {type(e).__name__}: {str(e)[:100]}")
        dialect_result = {"dialect": "unknown", "profile": {}}

    await websocket.send_json({
        "type": "transcript",
        "text": transcript_text,
        "lang": detected_lang,
        "dialect": dialect_result.get("dialect", "unknown"),
        "sentiment": sentiment_val.get("label", "unknown"),
        "ipl": sentiment_val.get("ipl", 1)
    })

    # NLU intent extraction with error handling
    intent = {"intent": "unclear", "confidence": 0.0}
    try:
        intent = await nlu_intent.extract_intent(transcript_text, detected_lang)
        logger.info(f"[{session['call_id']}] Intent: {intent.get('intent')}, confidence: {intent.get('confidence'):.2f}")
    except Exception as e:
        logger.error(f"[{session['call_id']}] Intent extraction failed: {type(e).__name__}: {str(e)[:100]}")
        intent = {"intent": "unclear", "confidence": 0.0}

    session["last_intent"] = intent

    try:
        turn_id = await store.save_turn(
            session["call_id"],
            session["turn_number"],
            transcript_text,
            intent,
            sentiment_val,
            0.0
        )
        session["last_turn_id"] = turn_id
        logger.info(f"[{session['call_id']}] Turn {session['turn_number']} saved: {turn_id}")
    except Exception as e:
        logger.error(f"[{session['call_id']}] Failed to save turn {session['turn_number']}: {type(e).__name__}: {str(e)[:100]}")
        session["last_turn_id"] = None
        return

    confidence = confidence_scorer.compute_confidence(intent, sentiment_val, session["attempt"])
    escalate, reason = confidence_scorer.should_escalate(confidence, sentiment_val, session["attempt"])
    
    logger.info(f"[{session['call_id']}] Confidence: {confidence:.2f}, Escalate: {escalate}, Reason: {reason}")

    await websocket.send_json({
        "type": "intent",
        "data": intent,
        "confidence": confidence,
        "sentiment": sentiment_val
    })

    # Publish turn update to Redis pub/sub for agent dashboard
    if redis_client:
        try:
            await redis_client.publish(
                f"call_updates:{session['call_id']}",
                json.dumps({
                    "type": "turn_processed",
                    "turn_id": session["last_turn_id"],
                    "turn_number": session["turn_number"],
                    "transcript": transcript_text,
                    "intent": intent,
                    "confidence": confidence,
                    "sentiment": sentiment_val,
                    "timestamp": datetime.now().isoformat()
                })
            )
        except Exception as e:
            logger.warning(f"[{session['call_id']}] Failed to publish turn update: {str(e)[:50]}")

    if escalate:
        await websocket.send_json({
            "type": "state",
            "state": "handoff",
            "reason": reason,
            "context": session
        })
        
        try:
            await store.save_escalation(session["call_id"], reason, session)
            logger.info(f"[{session['call_id']}] Escalation saved: {reason}")
        except Exception as e:
            logger.error(f"[{session['call_id']}] Failed to save escalation: {type(e).__name__}: {str(e)[:100]}")
        
        # Publish escalation to Redis pub/sub
        if redis_client:
            try:
                await redis_client.publish(
                    f"call_updates:{session['call_id']}",
                    json.dumps({
                        "type": "escalation",
                        "reason": reason,
                        "timestamp": datetime.now().isoformat()
                    })
                )
            except Exception as e:
                logger.warning(f"[{session['call_id']}] Failed to publish escalation: {str(e)[:50]}")
        return

    await websocket.send_json({"type": "state", "state": "verifying"})
    
    try:
        tts_audio = await tts_engine.synthesize({**intent, "language": detected_lang})
        if tts_audio and len(tts_audio) > 0:
            await websocket.send_bytes(tts_audio)
            logger.info(f"[{session['call_id']}] TTS audio synthesized: {len(tts_audio)} bytes")
        else:
            print(f"[WS] TTS returned empty audio — skipping send")
            await websocket.send_json({
                "type": "alert",
                "level": "warn", 
                "message": "Audio synthesis unavailable — text-only mode"
            })
    except Exception as e:
        logger.error(f"[{session['call_id']}] TTS synthesis failed: {type(e).__name__}: {str(e)[:100]}")
        await websocket.send_json({"type": "alert", "level": "warn", "message": "Verification audio unavailable"})

    await redis_setex(f"session:{session['call_id']}", 3600, json.dumps(session))



async def handle_confirmation(websocket: WebSocket, session: dict, result: str):
    turn_id = session.get("last_turn_id")
    if not turn_id:
        logger.warning(f"[{session['call_id']}] Confirmation received but no turn_id found")
        return

    try:
        await store.save_confirmation(turn_id, result)
        logger.info(f"[{session['call_id']}] Confirmation saved: {result}")
    except Exception as e:
        logger.error(f"[{session['call_id']}] Failed to save confirmation: {type(e).__name__}: {str(e)[:100]}")

    if result == "full_match":
        session["attempt"] = 0
        await websocket.send_json({"type": "state", "state": "resolved"})
        await websocket.send_json({
            "type": "alert",
            "level": "info",
            "message": "Understanding confirmed. Issue logged."
        })
        logger.info(f"[{session['call_id']}] Call resolved: full_match")
        
        # Publish resolution to Redis pub/sub
        if redis_client:
            try:
                await redis_client.publish(
                    f"call_updates:{session['call_id']}",
                    json.dumps({
                        "type": "confirmation",
                        "result": "full_match",
                        "state": "resolved",
                        "timestamp": datetime.now().isoformat()
                    })
                )
            except Exception as e:
                logger.warning(f"[{session['call_id']}] Failed to publish resolution: {str(e)[:50]}")

    elif result == "partial_match":
        session["attempt"] += 1
        logger.info(f"[{session['call_id']}] Partial match, retry attempt {session['attempt']}")
        
        try:
            retry_audio = await tts_engine.synthesize({**session["last_intent"], "rephrase": True, "language": "en"})
            if retry_audio and len(retry_audio) > 0:
                await websocket.send_bytes(retry_audio)
            else:
                print(f"[WS] TTS retry returned empty audio — skipping send")
        except Exception as e:
            logger.error(f"[{session['call_id']}] TTS retry synthesis failed: {type(e).__name__}: {str(e)[:100]}")
        
        # Publish retry to Redis pub/sub
        if redis_client:
            try:
                await redis_client.publish(
                    f"call_updates:{session['call_id']}",
                    json.dumps({
                        "type": "confirmation",
                        "result": "partial_match",
                        "attempt": session["attempt"],
                        "timestamp": datetime.now().isoformat()
                    })
                )
            except Exception as e:
                logger.warning(f"[{session['call_id']}] Failed to publish retry: {str(e)[:50]}")

    elif result == "mismatch":
        session["attempt"] = int(os.getenv("MAX_ATTEMPTS", "2"))
        logger.info(f"[{session['call_id']}] Mismatch detected, escalating")
        
        await websocket.send_json({
            "type": "state",
            "state": "handoff",
            "reason": "citizen_mismatch"
        })
        
        try:
            await store.save_escalation(session["call_id"], "citizen_mismatch", session)
            logger.info(f"[{session['call_id']}] Escalation saved: citizen_mismatch")
        except Exception as e:
            logger.error(f"[{session['call_id']}] Failed to save escalation: {type(e).__name__}: {str(e)[:100]}")
        
        # Publish mismatch to Redis pub/sub
        if redis_client:
            try:
                await redis_client.publish(
                    f"call_updates:{session['call_id']}",
                    json.dumps({
                        "type": "confirmation",
                        "result": "mismatch",
                        "state": "handoff",
                        "timestamp": datetime.now().isoformat()
                    })
                )
            except Exception as e:
                logger.warning(f"[{session['call_id']}] Failed to publish mismatch: {str(e)[:50]}")

    await redis_setex(f"session:{session['call_id']}", 3600, json.dumps(session))



# Agent Dashboard REST API Routes
agent_router = APIRouter(prefix="/agent", tags=["agent"])

@agent_router.get("/call/{call_id}", response_model=CallContextResponse)
async def get_call(call_id: str):
    """Fetch full call context for agent review"""
    try:
        context = await store.get_call_context(call_id)
        if not context.get("call"):
            logger.warning(f"Agent requested non-existent call: {call_id}")
            raise HTTPException(status_code=404, detail="Call not found")
        
        call = context["call"]
        turns = [TurnResponse(**{k: v for k, v in dict(t).items() if k in TurnResponse.__fields__}) 
                 for t in context.get("turns", [])]
        
        logger.info(f"Agent retrieved call context: {call_id} ({len(turns)} turns)")
        
        return CallContextResponse(
            call_id=call_id,
            started_at=call.get("started_at"),
            ended_at=call.get("ended_at"),
            total_turns=call.get("total_turns", 0),
            outcome=call.get("outcome", "active"),
            turns=turns,
            escalation=context.get("escalation")
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving call context {call_id}: {type(e).__name__}: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail=str(e))

@agent_router.patch("/call/{call_id}/intent", status_code=200)
async def save_corrected_intent(call_id: str, correction: AgentIntentCorrection):
    """Save agent's corrected intent for a turn"""
    try:
        await store.save_agent_correction(correction.turn_id, correction.corrected_intent)
        logger.info(f"Agent corrected intent for turn {correction.turn_id}: {correction.corrected_intent.get('intent')}")
        
        # Publish update to Redis pub/sub
        if redis_client:
            try:
                await redis_client.publish(
                    f"call_updates:{call_id}",
                    json.dumps({
                        "type": "agent_correction",
                        "turn_id": correction.turn_id,
                        "corrected_intent": correction.corrected_intent,
                        "timestamp": datetime.now().isoformat()
                    })
                )
            except Exception as e:
                logger.warning(f"Failed to publish agent correction: {str(e)[:50]}")
        
        return {"status": "success", "turn_id": correction.turn_id}
    except Exception as e:
        logger.error(f"Error saving corrected intent for {correction.turn_id}: {type(e).__name__}: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail=str(e))

@agent_router.post("/call/{call_id}/escalate", status_code=200)
async def escalate_call(call_id: str, escalation: AgentEscalationRequest):
    """Manually escalate call to human agent"""
    try:
        session = await get_session_from_call_id(call_id)
        if not session:
            logger.warning(f"Agent escalation requested for non-existent session: {call_id}")
            raise HTTPException(status_code=404, detail="Call session not found")
        
        await store.save_escalation(call_id, escalation.reason, session)
        logger.info(f"Agent escalated call {call_id}: {escalation.reason}")
        
        # Publish escalation to Redis pub/sub
        if redis_client:
            try:
                await redis_client.publish(
                    f"call_updates:{call_id}",
                    json.dumps({
                        "type": "manual_escalation",
                        "reason": escalation.reason,
                        "timestamp": datetime.now().isoformat()
                    })
                )
            except Exception as e:
                logger.warning(f"Failed to publish escalation: {str(e)[:50]}")
        
        return {"status": "escalated", "call_id": call_id, "reason": escalation.reason}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error escalating call {call_id}: {type(e).__name__}: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail=str(e))

@agent_router.get("/calls/recent", response_model=LatestCallsResponse)
async def get_recent_calls():
    """Get last 20 calls summary"""
    try:
        calls = await store.get_recent_calls(20)
        call_summaries = [
            CallSummary(
                call_id=c['call_id'],
                started_at=c.get('started_at'),
                total_turns=c.get('total_turns', 0),
                outcome=c.get('outcome', 'active'),
                last_transcript=c.get('last_transcript')
            )
            for c in calls
        ]
        logger.info(f"Agent retrieved recent calls: {len(call_summaries)} calls")
        return LatestCallsResponse(calls=call_summaries)
    except Exception as e:
        logger.error(f"Error retrieving recent calls: {type(e).__name__}: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail=str(e))

@agent_router.get("/stats", response_model=StatsResponse)
async def get_statistics():
    """Get aggregate statistics for demo dashboard"""
    try:
        stats = await store.get_stats()
        logger.info(f"Agent retrieved statistics: {stats.get('total_calls', 0)} total calls")
        return StatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error retrieving statistics: {type(e).__name__}: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail=str(e))


app.include_router(agent_router)


# Agent WebSocket endpoint for live call updates
@app.websocket("/ws/agent/{call_id}")
async def websocket_agent_updates(websocket: WebSocket, call_id: str):
    """Subscribe to live call updates via Redis pub/sub"""
    await websocket.accept()
    logger.info(f"Agent subscribed to live updates for call: {call_id}")
    
    if not redis_client:
        logger.warning(f"Agent WebSocket for {call_id}: Redis unavailable")
        await websocket.send_json({"error": "Redis unavailable for live updates"})
        await websocket.close()
        return
    
    pubsub = None
    try:
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(f"call_updates:{call_id}")
        
        # Send initial call context
        try:
            context = await store.get_call_context(call_id)
            if context.get("call"):
                await websocket.send_json({
                    "type": "initial_context",
                    "data": {
                        "call_id": call_id,
                        "total_turns": context["call"].get("total_turns", 0),
                        "outcome": context["call"].get("outcome", "active"),
                        "turns_count": len(context.get("turns", []))
                    }
                })
                logger.info(f"Agent received initial context for {call_id}")
        except Exception as e:
            logger.error(f"Error sending initial context to agent for {call_id}: {type(e).__name__}: {str(e)[:100]}")
        
        # Listen for pub/sub messages
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    update = json.loads(message["data"])
                    await websocket.send_json({
                        "type": "call_update",
                        "data": update
                    })
                    logger.debug(f"Sent update to agent for {call_id}: {update.get('type')}")
                except json.JSONDecodeError as e:
                    logger.error(f"JSON decode error for agent update: {str(e)[:100]}")
                except Exception as e:
                    logger.error(f"Error sending update to agent for {call_id}: {type(e).__name__}: {str(e)[:100]}")
    
    except WebSocketDisconnect:
        logger.info(f"Agent WebSocket disconnected for call: {call_id}")
    
    except Exception as e:
        logger.error(f"Agent WebSocket error for {call_id}: {type(e).__name__}: {str(e)[:100]}")
    
    finally:
        if pubsub:
            try:
                await pubsub.unsubscribe(f"call_updates:{call_id}")
                await pubsub.close()
                logger.info(f"Agent pub/sub cleaned up for call: {call_id}")
            except Exception as e:
                logger.error(f"Error cleaning up pub/sub for {call_id}: {str(e)[:100]}")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        access_log=True
    )
