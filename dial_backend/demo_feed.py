import asyncio
import websockets
import json
import sys
import wave
import os
from datetime import datetime

async def run_call(wav_path: str, ws_url: str = "ws://localhost:8000/ws/call"):
    print(f"\n{'='*60}")
    print(f"DEMO CALL: {os.path.basename(wav_path)}")
    print(f"Time: {datetime.now().strftime('%H:%M:%S')}")
    print(f"{'='*60}")
    
    if not os.path.exists(wav_path):
        print(f"ERROR: File not found: {wav_path}")
        return
    
    results = {}
    
    try:
        async with websockets.connect(ws_url, ping_timeout=60) as ws:
            print(f"Connected to {ws_url}")
            
            # Stream audio file in 20ms chunks
            with wave.open(wav_path, 'rb') as wf:
                chunk_frames = int(wf.getframerate() * 0.02)
                total_frames = wf.getnframes()
                sent = 0
                
                print(f"Streaming {total_frames/wf.getframerate():.1f}s of audio...")
                
                while True:
                    data = wf.readframes(chunk_frames)
                    if not data:
                        break
                    await ws.send(data)
                    sent += chunk_frames
                    await asyncio.sleep(0.02)
                
                print(f"Audio streaming complete.")
            
            # Send force process signal
            await asyncio.sleep(0.5)
            await ws.send(json.dumps({"type": "force_process"}))
            print("Sent: force_process signal")
            
            # Wait for and display responses
            auto_confirmed = False
            start_time = asyncio.get_event_loop().time()
            
            while asyncio.get_event_loop().time() - start_time < 30:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=8)
                    
                    if isinstance(msg, bytes):
                        print(f"[TTS] Received {len(msg)} bytes of audio response")
                        # Auto-confirm after receiving audio
                        if not auto_confirmed:
                            await asyncio.sleep(2)
                            await ws.send(json.dumps({"type": "confirm", "result": "full_match"}))
                            auto_confirmed = True
                            print("[CONFIRM] Sent: full_match")
                    else:
                        data = json.loads(msg)
                        msg_type = data.get("type", "")
                        
                        if msg_type == "transcript":
                            text = data.get("text", "")
                            lang = data.get("lang", "unknown")
                            dialect = data.get("dialect", "unknown")
                            sentiment = data.get("sentiment", "unknown")
                            ipl = data.get("ipl", 0)
                            print(f"[TRANSCRIPT] [{lang}] '{text}'")
                            print(f"             Dialect: {dialect} | Sentiment: {sentiment} (IPL {ipl})")
                            results["transcript"] = text
                            results["lang"] = lang
                            results["dialect"] = dialect
                        
                        elif msg_type == "intent":
                            intent = data.get("data", {})
                            confidence = data.get("confidence", 0)
                            print(f"[INTENT] Issue: {intent.get('issue', 'unknown')}")
                            print(f"         Location: {intent.get('location', 'none')}")
                            print(f"         Urgency: {intent.get('urgency', 'unknown')}")
                            print(f"         Confidence: {confidence:.2f}")
                            results["intent"] = intent.get("issue")
                            results["confidence"] = confidence
                        
                        elif msg_type == "state":
                            state = data.get("state", "")
                            print(f"[STATE] {state.upper()}")
                            results["state"] = state
                            
                            if state == "resolved":
                                print("\n" + "="*60)
                                print("OUTCOME: RESOLVED")
                                print("="*60)
                                break
                            elif state == "handoff":
                                reason = data.get("reason", "unknown")
                                print(f"\n{'='*60}")
                                print(f"OUTCOME: ESCALATED TO HUMAN AGENT")
                                print(f"Reason: {reason}")
                                print("="*60)
                                results["escalated"] = True
                                results["reason"] = reason
                                break
                        
                        elif msg_type == "partial":
                            text = data.get("text", "")
                            if text:
                                print(f"[PARTIAL] '{text}'", end="\r")
                        
                        elif msg_type == "alert":
                            print(f"[ALERT] {data.get('message', '')}")
                
                except asyncio.TimeoutError:
                    if not auto_confirmed:
                        await ws.send(json.dumps({"type": "force_process"}))
                    else:
                        break
    
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
    
    # Print summary
    print(f"\nCALL SUMMARY:")
    print(f"  File:       {os.path.basename(wav_path)}")
    print(f"  Language:   {results.get('lang', 'unknown')}")
    print(f"  Dialect:    {results.get('dialect', 'unknown')}")
    print(f"  Intent:     {results.get('intent', 'unknown')}")
    print(f"  Confidence: {results.get('confidence', 0):.2f}")
    if results.get("escalated"):
        print(f"  Outcome:    ESCALATED ({results.get('reason', '')})")
    else:
        print(f"  Outcome:    RESOLVED")
    
    return results

async def main():
    files = sys.argv[1:] if len(sys.argv) > 1 else []
    
    if not files:
        print("Usage: python demo_feed.py <wav_file> [wav_file2] ...")
        print("Example: python demo_feed.py samples/call_english_16k.wav")
        return
    
    all_results = []
    for wav_file in files:
        result = await run_call(wav_file)
        all_results.append(result)
        if len(files) > 1:
            print("\nPausing 3 seconds before next call...")
            await asyncio.sleep(3)
    
    if len(all_results) > 1:
        print(f"\n{'='*60}")
        print("ALL CALLS SUMMARY")
        print(f"{'='*60}")
        for i, r in enumerate(all_results):
            outcome = "ESCALATED" if r and r.get("escalated") else "RESOLVED"
            print(f"Call {i+1}: {r.get('lang','?')} | {r.get('intent','?')} | {outcome}")

if __name__ == "__main__":
    asyncio.run(main())
