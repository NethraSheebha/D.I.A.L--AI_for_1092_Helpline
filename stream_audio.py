import asyncio
import websockets
import json
import sys
import os
from pydub import AudioSegment
from datetime import datetime

async def stream_file(file_path: str, ws_url: str = "ws://localhost:8000/ws/call"):
    print(f"\n{'='*60}")
    print(f"STREAMING CALL: {os.path.basename(file_path)}")
    print(f"Time: {datetime.now().strftime('%H:%M:%S')}")
    print(f"{'='*60}")
    
    if not os.path.exists(file_path):
        print(f"ERROR: File not found: {file_path}")
        return

    try:
        # Load and normalize audio to 16kHz Mono PCM
        print(f"Loading and converting {os.path.basename(file_path)}...")
        audio = AudioSegment.from_file(file_path)
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        raw_data = audio.raw_data
        
        async with websockets.connect(ws_url) as ws:
            print(f"Connected to {ws_url}")
            
            # Stream in 20ms chunks (640 bytes for 16kHz 16-bit mono)
            chunk_size = 640 
            print(f"Streaming {len(audio)/1000:.1f}s of audio...")
            
            for i in range(0, len(raw_data), chunk_size):
                chunk = raw_data[i:i+chunk_size]
                await ws.send(chunk)
                await asyncio.sleep(0.02) # Simulate real-time
                
            print("Audio streaming complete. Waiting for processing...")
            
            # Signal the backend to finalize the last segment
            await ws.send(json.dumps({"type": "force_process"}))
            
            # Listen for results
            start_time = asyncio.get_event_loop().time()
            while asyncio.get_event_loop().time() - start_time < 30:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=5)
                    if not isinstance(msg, bytes):
                        data = json.loads(msg)
                        mtype = data.get("type")
                        
                        if mtype == "transcript":
                            print(f"\n[TRANSCRIPT] {data.get('text')}")
                            print(f"Detected Lang: {data.get('lang')} | Dialect: {data.get('dialect')}")
                        
                        elif mtype == "intent":
                            intent = data.get("data", {})
                            print(f"[INTENT] {intent.get('issue')} (Conf: {data.get('confidence'):.2f})")
                        
                        elif mtype == "state":
                            state = data.get("state")
                            print(f"[STATE] {state.upper()}")
                            if state in ["resolved", "handoff"]:
                                break
                except asyncio.TimeoutError:
                    break

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python stream_audio.py <audio_file_path>")
    else:
        for file_path in sys.argv[1:]:
            asyncio.run(stream_file(file_path))
