import asyncio
import json
import logging
import os
import time
import websockets
from pydub import AudioSegment
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CallSimulator")

class CallSimulator:
    def __init__(self, websocket_url: str = "ws://localhost:8000/ws/call"):
        self.websocket_url = websocket_url
        self.chunk_size = 3200  # 100ms of 16kHz 16-bit mono PCM (16000 * 2 * 0.1)
        self.sample_rate = 16000
        self.is_active = False
        self.response_received = asyncio.Event()
        self.last_ai_response = None

    async def _load_audio_as_pcm(self, file_path: str):
        """Loads any audio format and converts to 16kHz 16-bit mono PCM."""
        if not os.path.exists(file_path):
            logger.error(f"Audio file not found: {file_path}")
            return None
        
        audio = AudioSegment.from_file(file_path)
        audio = audio.set_frame_rate(self.sample_rate).set_channels(1).set_sample_width(2)
        return audio.raw_data

    async def stream_clip(self, ws, file_path: str):
        """Streams a single audio clip in real-time chunks."""
        pcm_data = await self._load_audio_as_pcm(file_path)
        if not pcm_data:
            return

        logger.info(f"Streaming clip: {os.path.basename(file_path)} ({len(pcm_data)} bytes)")
        
        for i in range(0, len(pcm_data), self.chunk_size):
            chunk = pcm_data[i:i + self.chunk_size]
            await ws.send(chunk)
            # Sleep to simulate real-time (100ms for 3200 bytes at 16kHz 16-bit)
            await asyncio.sleep(0.1)
        
        # Send a small silent gap or just wait
        logger.info(f"Finished streaming: {os.path.basename(file_path)}")

    async def run_scenario(self, scenario_id: str = "default"):
        """
        Orchestrates the conversation flow using the provided samples:
        p1.mp4 -> Greeting
        p2.mp4 -> Issue Description
        p3mp4.mp4 -> Location
        """
        try:
            async with websockets.connect(self.websocket_url) as ws:
                logger.info(f"Connected to {self.websocket_url} for simulation")
                
                # Setup listener for AI responses
                listen_task = asyncio.create_task(self._listen_for_responses(ws))
                
                # Mapping the user's specific sample files
                clips = ["p1.mp4", "p2.mp4", "p3mp4.mp4"]
                # Try both common start paths for resilience
                base_dir = "samples" if os.path.exists("samples") else "dial_backend/samples"
                
                for clip_name in clips:
                    clip_path = os.path.join(base_dir, clip_name)
                    if not os.path.exists(clip_path):
                        logger.warning(f"Clip {clip_name} not found in {base_dir}, skipping.")
                        continue

                    self.response_received.clear()
                    logger.info(f"--- STARTING SEGMENT: {clip_name} ---")
                    await self.stream_clip(ws, clip_path)
                    
                    # Wait for AI to respond before sending next clip
                    logger.info("Waiting for AI response...")
                    try:
                        # Wait for the AI's response before proceeding to next segment
                        await asyncio.wait_for(self.response_received.wait(), timeout=25)
                        logger.info(f"AI Interaction Complete for {clip_name}")
                        # Natural pause between turns
                        await asyncio.sleep(2.0)
                    except asyncio.TimeoutError:
                        logger.error("AI response timeout. Advancing to next segment...")

                logger.info("--- SIMULATION COMPLETE ---")
                listen_task.cancel()
                
        except Exception as e:
            logger.error(f"Simulation failed: {e}")

    async def _listen_for_responses(self, ws):
        """Listens for JSON messages from the backend to detect AI completion."""
        async for message in ws:
            try:
                data = json.loads(message)
                if data.get("type") == "state" and data.get("state") == "verifying":
                    # AI is about to speak or has started
                    logger.info("AI State: Verifying...")
                
                if data.get("type") == "intent":
                    # This usually comes before the AI speaks
                    logger.info(f"AI detected intent: {data.get('data')}")

                # In this specific backend, 'state: verifying' or 'state: resolved' usually 
                # means the AI has finished its logic. We'll use a small extra delay 
                # to account for TTS playback simulation.
                if data.get("type") == "state" and data.get("state") in ["verifying", "resolved"]:
                    self.last_ai_response = data.get("ai_response", "AI Thinking...")
                    # Delay to let "AI finish speaking"
                    await asyncio.sleep(2) 
                    self.response_received.set()

            except json.JSONDecodeError:
                # Binary data (AI TTS audio) - skip
                pass
            except Exception as e:
                logger.error(f"Error in listener: {e}")

async def start_simulation(scenario_id: str):
    """Entry point for triggering a simulation."""
    simulator = CallSimulator()
    await simulator.run_scenario(scenario_id)
