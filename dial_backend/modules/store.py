import os
import json
from typing import Dict, List, Optional
from uuid import uuid4
from datetime import datetime

try:
    import asyncpg
except ImportError:
    asyncpg = None

pool = None

# In-memory fallback storage when database is unavailable
mock_storage = {
    "calls": {},
    "turns": {},
    "escalations": {},
    "feedback": {}
}

async def init_db():
    global pool
    if asyncpg is None:
        print("⚠️ PostgreSQL driver unavailable; using in-memory storage")
        return
    try:
        db_url = os.getenv("POSTGRES_URL", "postgresql://user:password@localhost:5432/dial_db")
        pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10)
    except Exception as e:
        print(f"⚠️ PostgreSQL unavailable: {str(e)[:50]}")

async def close_db():
    global pool
    if pool:
        await pool.close()

async def create_call(call_id: str) -> None:
    global pool
    if pool:
        try:
            async with pool.acquire() as con:
                await con.execute("INSERT INTO calls (call_id) VALUES ($1)", call_id)
            return
        except Exception as e:
            pass
    
    # Fallback to in-memory storage
    mock_storage["calls"][call_id] = {
        "call_id": call_id,
        "started_at": datetime.utcnow().isoformat(),
        "ended_at": None,
        "outcome": "active",
        "final_intent": None,
        "dominant_dialect": None,
        "total_turns": 0
    }

async def save_turn(call_id: str, turn_number: int, transcript: str,
                    intent: dict, sentiment: dict, confidence: float) -> str:
    global pool
    turn_id = str(uuid4())
    
    if pool:
        try:
            async with pool.acquire() as con:
                await con.execute(
                    """INSERT INTO turns 
                       (turn_id, call_id, turn_number, transcript, detected_lang, 
                        intent_raw, sentiment_raw, confidence)
                       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)""",
                    turn_id, call_id, turn_number, transcript,
                    intent.get("language", "en"),
                    json.dumps(intent), json.dumps(sentiment), confidence
                )
                
                await con.execute(
                    "UPDATE calls SET total_turns = total_turns + 1 WHERE call_id = $1",
                    call_id
                )
            return turn_id
        except Exception as e:
            pass
    
    # Fallback to in-memory storage
    turn_data = {
        "turn_id": turn_id,
        "call_id": call_id,
        "turn_number": turn_number,
        "created_at": datetime.utcnow().isoformat(),
        "transcript": transcript,
        "detected_lang": intent.get("language", "en"),
        "intent_raw": intent,
        "sentiment_raw": sentiment,
        "confidence": confidence,
        "verification_sent": False,
        "citizen_confirmed": None,
        "agent_corrected": False,
        "corrected_intent": None
    }
    
    mock_storage["turns"][turn_id] = turn_data
    
    # Update call's turn count
    if call_id in mock_storage["calls"]:
        mock_storage["calls"][call_id]["total_turns"] += 1
    
    return turn_id

async def save_confirmation(turn_id: str, result: str) -> None:
    global pool
    if pool:
        try:
            async with pool.acquire() as con:
                await con.execute(
                    "UPDATE turns SET citizen_confirmed = $1, verification_sent = TRUE WHERE turn_id = $2",
                    result, turn_id
                )
                
                turn = await con.fetchrow("SELECT * FROM turns WHERE turn_id = $1", turn_id)
                if turn:
                    await con.execute(
                        """INSERT INTO feedback (turn_id, signal, original_intent)
                           VALUES ($1, $2, $3::jsonb)""",
                        turn_id, result, turn['intent_raw']
                    )
            return
        except Exception as e:
            pass
    
    # Fallback to in-memory storage
    if turn_id in mock_storage["turns"]:
        mock_storage["turns"][turn_id]["citizen_confirmed"] = result
        mock_storage["turns"][turn_id]["verification_sent"] = True
        
        # Add feedback
        feedback_id = str(uuid4())
        mock_storage["feedback"][feedback_id] = {
            "feedback_id": feedback_id,
            "turn_id": turn_id,
            "signal": result,
            "original_intent": mock_storage["turns"][turn_id].get("intent_raw"),
            "corrected_intent": None,
            "created_at": datetime.utcnow().isoformat()
        }

async def save_escalation(call_id: str, reason: str, context: dict) -> None:
    global pool
    if pool:
        try:
            async with pool.acquire() as con:
                await con.execute(
                    """INSERT INTO escalations (call_id, reason, context_snapshot)
                       VALUES ($1, $2, $3::jsonb)""",
                    call_id, reason, json.dumps(context)
                )
                
                await con.execute(
                    "UPDATE calls SET outcome = 'escalated', ended_at = NOW() WHERE call_id = $1",
                    call_id
                )
            return
        except Exception as e:
            pass
    
    # Fallback to in-memory storage
    escalation_id = str(uuid4())
    mock_storage["escalations"][escalation_id] = {
        "escalation_id": escalation_id,
        "call_id": call_id,
        "reason": reason,
        "escalated_at": datetime.utcnow().isoformat(),
        "context_snapshot": context
    }
    
    if call_id in mock_storage["calls"]:
        mock_storage["calls"][call_id]["outcome"] = "escalated"
        mock_storage["calls"][call_id]["ended_at"] = datetime.utcnow().isoformat()

async def save_agent_correction(turn_id: str, corrected_intent: dict) -> None:
    global pool
    if pool:
        try:
            async with pool.acquire() as con:
                await con.execute(
                    "UPDATE turns SET agent_corrected = TRUE, corrected_intent = $1::jsonb WHERE turn_id = $2",
                    json.dumps(corrected_intent), turn_id
                )
                
                await con.execute(
                    """INSERT INTO feedback (turn_id, signal, corrected_intent)
                       VALUES ($1, $2, $3::jsonb)""",
                    turn_id, 'agent_correction', json.dumps(corrected_intent)
                )
            return
        except Exception as e:
            pass
    
    # Fallback to in-memory storage
    if turn_id in mock_storage["turns"]:
        mock_storage["turns"][turn_id]["agent_corrected"] = True
        mock_storage["turns"][turn_id]["corrected_intent"] = corrected_intent
        
        # Add feedback
        feedback_id = str(uuid4())
        mock_storage["feedback"][feedback_id] = {
            "feedback_id": feedback_id,
            "turn_id": turn_id,
            "signal": 'agent_correction',
            "original_intent": mock_storage["turns"][turn_id].get("intent_raw"),
            "corrected_intent": corrected_intent,
            "created_at": datetime.utcnow().isoformat()
        }

async def get_call_context(call_id: str) -> dict:
    global pool
    
    fallback = {
        "call": None,
        "turns": [],
        "escalation": None
    }
    
    if pool:
        try:
            async with pool.acquire() as con:
                call = await con.fetchrow("SELECT * FROM calls WHERE call_id = $1", call_id)
                turns = await con.fetch("SELECT * FROM turns WHERE call_id = $1 ORDER BY turn_number", call_id)
                escalation = await con.fetchrow("SELECT * FROM escalations WHERE call_id = $1", call_id)
                
                return {
                    "call": dict(call) if call else None,
                    "turns": [dict(t) for t in turns],
                    "escalation": dict(escalation) if escalation else None
                }
        except Exception as e:
            pass
    
    # Fallback to in-memory storage
    if call_id in mock_storage["calls"]:
        call_data = mock_storage["calls"][call_id]
        
        # Get turns for this call
        turns = [t for t in mock_storage["turns"].values() if t["call_id"] == call_id]
        turns = sorted(turns, key=lambda t: t.get("turn_number", 0))
        
        # Get escalation for this call
        escalation = None
        for esc in mock_storage["escalations"].values():
            if esc["call_id"] == call_id:
                escalation = esc
                break
        
        return {
            "call": call_data,
            "turns": turns,
            "escalation": escalation
        }
    
    return fallback

async def get_recent_calls(limit: int = 20) -> List[dict]:
    global pool
    
    if pool:
        try:
            async with pool.acquire() as con:
                calls = await con.fetch(
                    """SELECT call_id, started_at, total_turns, outcome, 
                       (SELECT transcript FROM turns WHERE call_id = calls.call_id ORDER BY turn_number DESC LIMIT 1) as last_transcript
                       FROM calls ORDER BY started_at DESC LIMIT $1""",
                    limit
                )
                return [dict(c) for c in calls]
        except Exception as e:
            pass
    
    # Fallback to in-memory storage
    calls_list = list(mock_storage["calls"].values())
    calls_list = sorted(calls_list, key=lambda c: c.get("started_at", ""), reverse=True)
    
    result = []
    for call in calls_list[:limit]:
        # Get last turn for this call
        turns_for_call = [t for t in mock_storage["turns"].values() if t["call_id"] == call["call_id"]]
        last_turn = turns_for_call[-1] if turns_for_call else None
        
        result.append({
            "call_id": call["call_id"],
            "started_at": call.get("started_at"),
            "total_turns": call.get("total_turns", 0),
            "outcome": call.get("outcome", "active"),
            "last_transcript": last_turn.get("transcript") if last_turn else None
        })
    
    return result

async def get_stats() -> dict:
    global pool
    
    fallback = {
        "total_calls": 0,
        "resolved_calls": 0,
        "escalated_calls": 0,
        "failed_calls": 0,
        "avg_turns_per_call": 0.0,
        "languages_detected": {},
        "intents_distribution": {},
        "sentiment_distribution": {}
    }
    
    if pool:
        try:
            async with pool.acquire() as con:
                # Get call counts
                total = await con.fetchval("SELECT COUNT(*) FROM calls")
                resolved = await con.fetchval("SELECT COUNT(*) FROM calls WHERE outcome = 'resolved'")
                escalated = await con.fetchval("SELECT COUNT(*) FROM calls WHERE outcome = 'escalated'")
                failed = await con.fetchval("SELECT COUNT(*) FROM calls WHERE outcome = 'failed'")
                
                # Get average turns
                avg_turns = await con.fetchval("SELECT AVG(total_turns) FROM calls WHERE total_turns > 0")
                
                # Get language distribution
                lang_stats = await con.fetch(
                    "SELECT detected_lang, COUNT(*) as count FROM turns GROUP BY detected_lang"
                )
                languages_detected = {row['detected_lang']: row['count'] for row in lang_stats}
                
                # Get intent distribution
                intent_stats = await con.fetch(
                    "SELECT intent_raw->>'intent' as intent, COUNT(*) as count FROM turns WHERE intent_raw IS NOT NULL GROUP BY intent_raw->>'intent' LIMIT 10"
                )
                intents_distribution = {}
                for row in intent_stats:
                    if row['intent']:
                        intents_distribution[row['intent']] = row['count']
                
                # Get sentiment distribution
                sentiment_stats = await con.fetch(
                    "SELECT sentiment_raw->>'label' as label, COUNT(*) as count FROM turns WHERE sentiment_raw IS NOT NULL GROUP BY sentiment_raw->>'label'"
                )
                sentiment_distribution = {row['label']: row['count'] for row in sentiment_stats if row['label']}
                
                resolution_rate = (resolved / total * 100) if total > 0 else 0.0
                escalation_rate = (escalated / total * 100) if total > 0 else 0.0
                
                return {
                    "total_calls": total,
                    "resolved_calls": resolved,
                    "escalated_calls": escalated,
                    "failed_calls": failed,
                    "resolution_rate": round(resolution_rate, 2),
                    "escalation_rate": round(escalation_rate, 2),
                    "avg_turns_per_call": round(avg_turns or 0.0, 2),
                    "languages_detected": languages_detected,
                    "intents_distribution": intents_distribution,
                    "sentiment_distribution": sentiment_distribution
                }
        except Exception as e:
            pass
    
    # Fallback to in-memory storage
    calls_list = list(mock_storage["calls"].values())
    turns_list = list(mock_storage["turns"].values())
    
    total = len(calls_list)
    resolved = sum(1 for c in calls_list if c.get("outcome") == "resolved")
    escalated = sum(1 for c in calls_list if c.get("outcome") == "escalated")
    failed = sum(1 for c in calls_list if c.get("outcome") == "failed")
    
    avg_turns = sum(c.get("total_turns", 0) for c in calls_list) / total if total > 0 else 0.0
    
    # Language distribution
    languages_detected = {}
    for turn in turns_list:
        lang = turn.get("detected_lang", "en")
        languages_detected[lang] = languages_detected.get(lang, 0) + 1
    
    # Intent distribution
    intents_distribution = {}
    for turn in turns_list:
        if turn.get("intent_raw"):
            intent = turn["intent_raw"].get("intent", "unknown")
            intents_distribution[intent] = intents_distribution.get(intent, 0) + 1
    
    # Sentiment distribution
    sentiment_distribution = {}
    for turn in turns_list:
        if turn.get("sentiment_raw"):
            label = turn["sentiment_raw"].get("label", "unknown")
            sentiment_distribution[label] = sentiment_distribution.get(label, 0) + 1
    
    resolution_rate = (resolved / total * 100) if total > 0 else 0.0
    escalation_rate = (escalated / total * 100) if total > 0 else 0.0
    
    return {
        "total_calls": total,
        "resolved_calls": resolved,
        "escalated_calls": escalated,
        "failed_calls": failed,
        "resolution_rate": round(resolution_rate, 2),
        "escalation_rate": round(escalation_rate, 2),
        "avg_turns_per_call": round(avg_turns, 2),
        "languages_detected": languages_detected,
        "intents_distribution": intents_distribution,
        "sentiment_distribution": sentiment_distribution
    }
