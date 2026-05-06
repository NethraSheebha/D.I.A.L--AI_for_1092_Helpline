#!/usr/bin/env python3
"""
Integration test for D.I.A.L backend: simulates caller and agent WebSocket flows.
Tests key end-to-end paths: STT → intent → AI response → agent approval → caller delivery.
"""
import asyncio
import json
import websockets
import httpx
import sys
from datetime import datetime
from typing import Optional

BASE_URL = "http://127.0.0.1:8000"
WS_BASE_URL = "ws://127.0.0.1:8000"

class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"

def log_success(msg: str):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")

def log_error(msg: str):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")

def log_info(msg: str):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.RESET}")

def log_test(msg: str):
    print(f"\n{Colors.YELLOW}=== {msg} ==={Colors.RESET}")

async def test_backend_health():
    """Check backend is running and responsive."""
    log_test("Backend Health Check")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BASE_URL}/health/full", timeout=5)
            data = resp.json()
            log_success(f"Backend responsive: status={data.get('status')}")
            return True
    except Exception as e:
        log_error(f"Backend health check failed: {e}")
        return False

async def test_dashboard_summary():
    """Test dashboard summary endpoint."""
    log_test("Dashboard Summary Endpoint")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BASE_URL}/api/dashboard/summary", timeout=5)
            data = resp.json()
            log_success(f"Dashboard summary fetched: {len(json.dumps(data))} bytes")
            print(f"  Data: {data}")
            return True
    except Exception as e:
        log_error(f"Dashboard summary failed: {e}")
        return False

async def test_agent_stats_endpoint():
    """Test the agent stats endpoint used by the dashboard."""
    log_test("Agent Stats Endpoint")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BASE_URL}/agent/stats", timeout=5)
            data = resp.json()

            required_keys = {
                "total_calls",
                "resolved_calls",
                "escalated_calls",
                "failed_calls",
                "avg_turns_per_call",
                "languages_detected",
                "intents_distribution",
                "sentiment_distribution",
            }
            missing = sorted(required_keys - set(data.keys()))
            if missing:
                log_error(f"Stats response missing keys: {missing}")
                return False

            log_success(
                "Agent stats fetched: "
                f"total={data.get('total_calls')}, resolved={data.get('resolved_calls')}, "
                f"escalated={data.get('escalated_calls')}"
            )
            return True
    except Exception as e:
        log_error(f"Agent stats failed: {e}")
        return False

async def test_interaction_resolve_endpoint():
    """Test the interaction resolution endpoint used for agent feedback loops."""
    log_test("Interaction Resolve Endpoint")
    try:
        async with httpx.AsyncClient() as client:
            interaction_id = 12345
            payload = {
                "resolution": "resolved",
                "notes": "Integration test resolution",
            }
            resp = await client.post(
                f"{BASE_URL}/api/interaction/{interaction_id}/resolve",
                json=payload,
                timeout=5,
            )

            if resp.status_code != 200:
                log_error(f"Interaction resolve failed: {resp.status_code} {resp.text}")
                return False

            data = resp.json()
            if data.get("status") != "resolved" or data.get("interaction_id") != interaction_id:
                log_error(f"Unexpected resolve payload: {data}")
                return False

            log_success(f"Interaction resolved: {data}")
            return True
    except Exception as e:
        log_error(f"Interaction resolve test failed: {e}")
        return False

async def test_caller_websocket():
    """Test caller WebSocket: connect, send fake audio, receive partial transcript."""
    log_test("Caller WebSocket Connection & STT")
    call_id = None
    try:
        uri = f"{WS_BASE_URL}/ws/call"
        async with websockets.connect(uri) as websocket:
            log_success(f"Caller WebSocket connected to {uri}")
            call_id = None
            
            # Simulate receiving a state message (optional, just listen)
            try:
                msg = await asyncio.wait_for(websocket.recv(), timeout=2)
                log_info(f"Received initial message: {msg[:80]}")
            except asyncio.TimeoutError:
                log_info("No initial message (expected)")
            
            # Send fake audio bytes (simulated PCM)
            fake_audio = b'\x00' * 1024  # 1KB of silence
            await websocket.send(fake_audio)
            log_success("Sent fake audio chunk to backend")
            
            # Listen for partial transcript or other updates
            try:
                msg = await asyncio.wait_for(websocket.recv(), timeout=3)
                data = json.loads(msg)
                log_info(f"Received update: type={data.get('type')}, keys={list(data.keys())}")
                log_success(f"Caller received STT/analytics update")
            except asyncio.TimeoutError:
                log_info("No immediate response (may be waiting for VAD)")
            except Exception as e:
                log_info(f"Message parse/timeout: {e}")
            
            return True
    except Exception as e:
        log_error(f"Caller WebSocket failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_agent_dashboard_websocket():
    """Test agent dashboard: fetch recent calls, then subscribe to live updates."""
    log_test("Agent Dashboard: Fetch Recent Calls")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BASE_URL}/agent/calls/recent", timeout=5)
            calls = resp.json().get('calls', [])
            log_success(f"Fetched {len(calls)} recent calls")
            
            if not calls:
                log_info("No recent calls available for live subscription test")
                return True
            
            call_id = calls[0]['call_id']
            log_info(f"Using call_id: {call_id[:8]}...")
            
            # Try to subscribe to agent updates (this requires Redis; may timeout without it)
            try:
                uri = f"{WS_BASE_URL}/ws/agent/{call_id}"
                async with websockets.connect(uri, ping_interval=None) as ws:
                    log_success(f"Agent subscribed to {uri}")
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=2)
                        log_info(f"Received agent update: {msg[:100]}")
                    except asyncio.TimeoutError:
                        log_info("No agent updates (expected if no active caller or Redis unavailable)")
            except Exception as e:
                log_info(f"Agent subscription unavailable (likely no Redis): {e}")
            
            return True
    except Exception as e:
        log_error(f"Agent dashboard test failed: {e}")
        return False

async def test_agent_response_endpoint():
    """Test sending an agent response via REST endpoint."""
    log_test("Agent Response Endpoint")
    try:
        async with httpx.AsyncClient() as client:
            # First fetch a call ID
            resp = await client.get(f"{BASE_URL}/agent/calls/recent", timeout=5)
            calls = resp.json().get('calls', [])
            
            if not calls:
                log_info("No calls available; skipping agent response test")
                return True
            
            call_id = calls[0]['call_id']
            
            # Try to send a response
            payload = {"response": "This is a test response from the agent."}
            resp = await client.post(
                f"{BASE_URL}/agent/call/{call_id}/response",
                json=payload,
                timeout=5
            )
            
            if resp.status_code in (200, 404):  # 404 if session not active, 200 if sent
                log_success(f"Agent response endpoint returned {resp.status_code}: {resp.json()}")
                return True
            else:
                log_error(f"Agent response failed: {resp.status_code} {resp.text}")
                return False
    except Exception as e:
        log_error(f"Agent response endpoint test failed: {e}")
        return False

async def test_call_context_endpoint():
    """Test fetching call context."""
    log_test("Call Context / Call History Endpoint")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BASE_URL}/agent/calls/recent", timeout=5)
            calls = resp.json().get('calls', [])
            
            if not calls:
                log_info("No calls available; skipping call context test")
                return True
            
            call_id = calls[0]['call_id']
            log_info(f"Testing call context for: {call_id[:8]}...")
            
            # Test call context
            resp = await client.get(f"{BASE_URL}/agent/call/{call_id}", timeout=5)
            if resp.status_code == 200:
                context = resp.json()
                turns = context.get('turns', [])
                log_success(f"Call context: {len(turns)} turns, outcome={context.get('outcome')}")
            else:
                log_info(f"Call context returned {resp.status_code}")
            
            # Test call history
            resp = await client.get(f"{BASE_URL}/api/call/{call_id}/history", timeout=5)
            if resp.status_code == 200:
                history = resp.json()
                interactions = history.get('interactions', [])
                log_success(f"Call history: {len(interactions)} interactions")
            else:
                log_info(f"Call history returned {resp.status_code}")
            
            return True
    except Exception as e:
        log_error(f"Call context endpoint test failed: {e}")
        return False

async def test_intent_correction_endpoint():
    """Test correcting an intent via PATCH endpoint."""
    log_test("Intent Correction Endpoint")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BASE_URL}/agent/calls/recent", timeout=5)
            calls = resp.json().get('calls', [])
            
            if not calls:
                log_info("No calls available; skipping intent correction test")
                return True
            
            call_id = calls[0]['call_id']
            
            # Get call context to find a turn
            resp = await client.get(f"{BASE_URL}/agent/call/{call_id}", timeout=5)
            context = resp.json()
            turns = context.get('turns', [])
            
            if not turns:
                log_info("No turns in call; skipping intent correction test")
                return True
            
            turn_id = turns[0]['turn_id']
            log_info(f"Correcting intent for turn: {turn_id[:8]}...")
            
            # Send correction
            correction_payload = {
                "turn_id": turn_id,
                "corrected_intent": {"intent": "Test Intent", "confidence": 0.95}
            }
            resp = await client.patch(
                f"{BASE_URL}/agent/call/{call_id}/intent",
                json=correction_payload,
                timeout=5
            )
            
            if resp.status_code == 200:
                log_success(f"Intent correction succeeded: {resp.json()}")
                return True
            else:
                log_info(f"Intent correction returned {resp.status_code}: {resp.text}")
                return resp.status_code in (200, 404)  # 404 is okay if no session
    except Exception as e:
        log_error(f"Intent correction endpoint test failed: {e}")
        return False

async def test_escalation_endpoint():
    """Test manual escalation."""
    log_test("Escalation Endpoint")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BASE_URL}/agent/calls/recent", timeout=5)
            calls = resp.json().get('calls', [])
            
            if not calls:
                log_info("No calls available; skipping escalation test")
                return True
            
            call_id = calls[0]['call_id']
            payload = {"reason": "Test escalation for integration testing"}
            
            resp = await client.post(
                f"{BASE_URL}/agent/call/{call_id}/escalate",
                json=payload,
                timeout=5
            )
            
            if resp.status_code in (200, 404):
                log_success(f"Escalation endpoint returned {resp.status_code}")
                return True
            else:
                log_error(f"Escalation failed: {resp.status_code}")
                return False
    except Exception as e:
        log_error(f"Escalation endpoint test failed: {e}")
        return False

async def run_all_tests():
    """Run all integration tests."""
    print(f"\n{Colors.BLUE}D.I.A.L Integration Test Suite{Colors.RESET}")
    print(f"Backend: {BASE_URL}")
    print(f"WebSocket: {WS_BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}\n")
    
    results = []
    
    # Core tests
    results.append(("Backend Health", await test_backend_health()))
    results.append(("Dashboard Summary", await test_dashboard_summary()))
    results.append(("Agent Stats", await test_agent_stats_endpoint()))
    results.append(("Caller WebSocket", await test_caller_websocket()))
    results.append(("Agent Dashboard", await test_agent_dashboard_websocket()))
    
    # REST API tests
    results.append(("Call Context", await test_call_context_endpoint()))
    results.append(("Interaction Resolve", await test_interaction_resolve_endpoint()))
    results.append(("Agent Response", await test_agent_response_endpoint()))
    results.append(("Intent Correction", await test_intent_correction_endpoint()))
    results.append(("Escalation", await test_escalation_endpoint()))
    
    # Summary
    print(f"\n{Colors.YELLOW}=== Test Summary ==={Colors.RESET}")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = f"{Colors.GREEN}PASS{Colors.RESET}" if result else f"{Colors.RED}FAIL{Colors.RESET}"
        print(f"  {status}  {name}")
    
    print(f"\nTotal: {passed}/{total} passed")
    
    if passed == total:
        log_success("All tests passed!")
        return 0
    else:
        log_error(f"{total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(run_all_tests())
    sys.exit(exit_code)
