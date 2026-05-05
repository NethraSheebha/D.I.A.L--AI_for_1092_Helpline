from __future__ import annotations

import asyncio
import json
import uuid
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

from backend.confidence_engine import ConfidenceEngine
from backend.llm_agent import Gemma4Agent
from backend.stt import IndicConformerSTT
from backend.tts import IndicParlerTTS

app = FastAPI(title="Voice-to-Voice AI Helpline")

confidence_engine = ConfidenceEngine()
active_calls: dict[str, dict] = {}


@app.get("/")
async def root():
    """Serve health check."""
    return {"status": "running", "service": "AI Helpline Voice Agent"}


@app.websocket("/ws/voice-call")
async def websocket_voice_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for voice-to-voice streaming.
    Handles bidirectional audio and control messages.
    """
    await websocket.accept()
    call_id = str(uuid.uuid4())

    llm_agent = Gemma4Agent()
    stt_engine = IndicConformerSTT()
    tts_engine = IndicParlerTTS()

    active_calls[call_id] = {
        "call_id": call_id,
        "llm_agent": llm_agent,
        "stt_engine": stt_engine,
        "tts_engine": tts_engine,
        "status": "active",
    }

    try:
        await websocket.send_json(
            {
                "type": "connection_established",
                "call_id": call_id,
                "message": "Connected to AI Helpline. Please describe your issue.",
            }
        )

        while True:
            data = await websocket.receive()

            if "bytes" in data:
                pcm_bytes = data["bytes"]

                partial_text = stt_engine.append_pcm(pcm_bytes)
                if partial_text:
                    await websocket.send_json(
                        {"type": "partial_transcript", "text": partial_text}
                    )

            elif "text" in data:
                message = json.loads(data["text"])
                message_type = message.get("type")

                if message_type == "finalize_segment":
                    final_text = stt_engine.finalize_segment()

                    if final_text:
                        score, should_escalate = await confidence_engine.update_score(
                            call_id=call_id,
                            stt_text=final_text,
                            metadata={
                                "current_question": llm_agent.get_last_question(),
                                "high_distress": message.get("high_distress", False),
                            },
                        )

                        await websocket.send_json(
                            {
                                "type": "final_transcript",
                                "text": final_text,
                                "confidence_score": score,
                            }
                        )

                        if should_escalate:
                            escalation_msg = "connecting to human agent"

                            audio_chunks = tts_engine.enqueue_text(escalation_msg)
                            for chunk in audio_chunks:
                                await websocket.send_bytes(chunk)

                            final_chunk = tts_engine.flush()
                            if final_chunk:
                                await websocket.send_bytes(final_chunk)

                            await websocket.send_json(
                                {
                                    "type": "escalation",
                                    "message": escalation_msg,
                                    "call_id": call_id,
                                    "confidence_score": score,
                                }
                            )

                            active_calls[call_id]["status"] = "escalated"
                            break

                        token_generator = llm_agent.stream_response(final_text)

                        for token in token_generator:
                            audio_chunks = tts_engine.enqueue_text(token)
                            for chunk in audio_chunks:
                                await websocket.send_bytes(chunk)

                        final_chunk = tts_engine.flush()
                        if final_chunk:
                            await websocket.send_bytes(final_chunk)

                        await websocket.send_json(
                            {
                                "type": "ai_response_complete",
                                "prompt_text": llm_agent.state.history[-1].get(
                                    "assistant_prompt", ""
                                ),
                            }
                        )

                elif message_type == "end_call":
                    await websocket.send_json(
                        {
                            "type": "call_ended",
                            "call_id": call_id,
                            "summary": confidence_engine.get_call_summary(call_id),
                        }
                    )
                    break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
    finally:
        if call_id in active_calls:
            del active_calls[call_id]
        confidence_engine.reset_call(call_id)
        await websocket.close()


@app.get("/call-status/{call_id}")
async def get_call_status(call_id: str):
    """Retrieve the current status and summary of a call."""
    summary = confidence_engine.get_call_summary(call_id)
    if not summary:
        return {"error": "Call not found"}
    return summary


@app.get("/active-calls")
async def get_active_calls():
    """List all active calls."""
    return {
        "active_count": len(active_calls),
        "calls": [
            {"call_id": call_id, "status": info["status"]}
            for call_id, info in active_calls.items()
        ],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
