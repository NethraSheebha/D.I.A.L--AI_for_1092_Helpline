# 📞 D.I.A.L. - Dialect-aware Intent-verified Assist Line

**An Intelligent AI-Assisted Voice-to-Voice Communication Bridge for the Karnataka 1092 Citizen Helpline**

> Built for the **AI for Bharat Hackathon** - solving the last-mile communication gap in government emergency services.

---

## 📌 Table of Contents

1. [Problem Statement](#problem-statement)
2. [The Solution](#the-solution)
3. [System Architecture](#system-architecture)
4. [Core Modules](#core-modules)
5. [Call Flow](#call-flow)
6. [Tech Stack](#tech-stack)
7. [Project Structure](#project-structure)
8. [Database Schema](#database-schema)
9. [API Reference](#api-reference)
10. [Environment Variables](#environment-variables)
11. [Quick Start](#quick-start)
12. [Novelty Features](#novelty-features)

---

## 🚨 Problem Statement

The Karnataka Government's **1092 helpline** handles thousands of citizen calls daily. These calls are:

- **Multilingual** - Kannada, Hindi, English, code-mixed variants
- **Dialect-rich** - Dharwad, Mysuru, Coastal Tulu, Bangalore Urban, and Hindi-belt speakers all sound different
- **Emotionally charged** - distress, urgency, and confusion affect how people speak

The biggest failure in these interactions is not a lack of response, it's a **wrong response due to incorrect understanding**. A misheard location or misclassified issue can delay help when it matters most.

---

## 💡 The Solution

D.I.A.L. is a real-time AI-assisted voice layer that sits between the citizen and the agent. It:

1. **Transcribes** speech using an Indic-native ASR model from ai4bharat
2. **Classifies** intent and extracts structured data (issue, location, urgency)
3. **Verifies** its understanding with the citizen before acting using a LLM
4. **Hands off** to a human agent with full context when confidence is low or distress is high

The agent is never replaced, they are augmented with a live confidence score, dialect context, and a structured summary of the citizen's issue.

---

## 🏗️ System Architecture

<img width="1600" height="872" alt="image" src="https://github.com/user-attachments/assets/260806fa-90d3-4ee9-a35d-a3a56e6b1b23" />

---

## 🧩 Core Modules

### Adaptive Perception Layer - _The Ears_

- **`IndicConformerSTT`** (`ai4bharat/indic-conformer-600m-multilingual`) - incremental, streaming ASR with **<800ms** PCM chunk processing
- **`SileroVAD`** - energy-based voice activity detection to segment speech from silence
- **`AcousticAnalytics`** - real-time RMS, pitch jitter, and ZCR computation for the agent dashboard

### Cognitive Processing Layer - _The Brain_

- **`IndicBERTIntentExtractor`** - backed by Gemini 2.0 Flash with a keyword-based fallback; classifies into 10 civic intent categories with location and urgency extraction
- **`DialectFingerprinter`** - accumulates dialect signal hits across turns to identify regional speech patterns (Dharwad, Mysuru, Coastal, Urban, Hindi-belt)
- **`ConfidenceScorer`** - combines NLU confidence (60%), sentiment stability (30%), and attempt penalty (10%) into a single `[0, 1]` score
- **`AI Response`** - uses the textual message and intent to generate a response to the citizen or ask cross-questions for better understanding

### Verification Gate - _The Filter_

- After each turn, the AI summarizes its understanding and asks the citizen to confirm
- **Full match** → issue logged, call resolved
- **Partial match** → rephrased retry in the citizen's dialect
- **Mismatch / panic / max attempts** → hot handoff to human agent with full context

### Agent-Centric Assist - _The Bridge_

- **Live confidence meter** on the dashboard - agents see a real-time percentage and can intervene before a wrong summary is confirmed
- **Dialect context** - the agent knows which regional variant the citizen is speaking
- **Structured intent object** - `{ issue, location, urgency, language, dialect }` displayed alongside the live transcript

---

## 🔁 Call Flow

```
[ Citizen Audio ] ──WebSocket──► [ FastAPI Orchestrator ]
                                          │
                    ┌─────────────────────┴──────────────────────┐
                    │                                            │
          [ Stream A: Conversation ]               [ Stream B: Analytics ]
          STT → Gemini NLU → TTS                  DSP → Sentiment → Redis
                    │                                            │
          [ Response Audio to Citizen ]            [ Live Flags to Dashboard ]
```

Two parallel streams process every audio chunk simultaneously:

- **Stream A** handles transcription, intent extraction, response generation, verification, and TTS response
- **Stream B** computes acoustic vitals (pitch, RMS, ZCR) and publishes urgency flags to the agent dashboard in real time — often before the AI has finished responding

```
1.  Citizen calls → audio streamed as PCM chunks over WebSocket
2.  VAD detects speech segments
3.  STT transcribes in real time (partial transcripts sent to dashboard)
4.  Acoustic analytics compute vitals → dashboard updates (GREEN/YELLOW/RED)
5.  On silence: STT finalizes segment → NLU extracts intent via Gemini
6.  Confidence scored from NLU + sentiment + attempt count
7.  If confidence ≥ 0.65: AI generates verification summary → TTS plays to citizen
8.  Citizen confirms → "full_match" resolves call, "mismatch" triggers handoff
9.  If confidence < 0.65 or IPL = 5 (panic): immediate hot handoff to agent
10. Agent receives full context: transcript, intent, dialect, confidence history
```

---

## 🛠️ Tech Stack

| Layer                 | Technology                                              |
| --------------------- | ------------------------------------------------------- |
| Speech-to-Text        | `ai4bharat/indic-conformer-600m-multilingual`           |
| Text-to-Speech        | `ai4bharat/indic-parler-tts`                            |
| Intent & NLU          | Gemini 2.0 Flash (primary) + keyword fallback           |
| Sentiment / Acoustics | Custom DSP (ZCR, RMS, spectral centroid)                |
| LLM Agent             | `Gemma4Agent` with Gemini Flash + local Gemma4 fallback |
| Backend               | FastAPI + asyncio + WebSockets                          |
| Session Cache         | Redis (pub/sub for dashboard updates)                   |
| Database              | PostgreSQL (asyncpg) with in-memory fallback            |
| Frontend              | React 19 + Vite + Tailwind CSS v4                       |

---

## 📁 Project Structure

```
.
├── dial_backend/
│   ├── main.py                   # FastAPI app, WebSocket handler, REST API
│   ├── modules/
│   │   ├── stt.py                # IndicConformerSTT - incremental ASR
│   │   ├── tts.py                # IndicParlerTTS - sentence-level streaming TTS
│   │   ├── nlu.py                # Intent extraction, dialect fingerprinting
│   │   ├── sentiment.py          # Acoustic sentiment (IPL scoring)
│   │   ├── acoustic_analytics.py # Real-time DSP worker for dashboard
│   │   ├── confidence.py         # Confidence scoring + escalation logic
│   │   ├── llm_agent.py          # Gemma4Agent - verification conversation
│   │   ├── vad.py                # SileroVAD + ChunkBuffer
│   │   └── store.py              # PostgreSQL + in-memory fallback storage
│   └── sql/
│       └── schema.sql            # Database schema
│
├── d.i.a.l.-agent-dashboard/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx         # Agent authentication
│   │   │   ├── Home.tsx          # Call queue overview
│   │   │   ├── Dashboard.tsx     # Live call workspace
│   │   │   └── WrapUp.tsx        # Post-call summary
│   │   └── components/
│   │       └── Shared.tsx        # Reusable UI components
│   └── package.json
│
├── requirements.txt
└── .env
```

---

## 🗄️ Database Schema

```sql
calls        -- one row per call (outcome, dialect, total_turns)
turns        -- one row per speech turn (transcript, intent, sentiment, confidence)
escalations  -- logged when AI hands off to human agent
feedback     -- citizen confirmations and agent corrections (training signal)
```

---

## 🔌 API Reference

### WebSocket

| Endpoint            | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| `ws://host/ws/call` | Main call stream - send PCM bytes, receive JSON events and TTS audio |

**Inbound messages (client → server):**

```json
{ "type": "confirm", "result": "full_match | partial_match | mismatch" }
{ "type": "force_process" }
```

**Outbound events (server → client):**

```json
{ "type": "partial", "text": "...", "vitals": { "rms": 0.3, "zcr": 0.1 } }
{ "type": "transcript", "text": "...", "lang": "kn", "dialect": "mysuru_south", "sentiment": "urgent", "ipl": 3 }
{ "type": "intent", "data": { "issue": "...", "location": "...", "urgency": "high" }, "confidence": 0.82 }
{ "type": "state", "state": "verifying | resolved | handoff | processing" }
```

### REST

| Method | Endpoint                         | Description                                              |
| ------ | -------------------------------- | -------------------------------------------------------- |
| `GET`  | `/`                              | Health check                                             |
| `GET`  | `/health/full`                   | Component status (VAD, STT, NLU, TTS, Redis, PostgreSQL) |
| `GET`  | `/agent/call/{call_id}`          | Full call context for agent review                       |
| `POST` | `/agent/call/{call_id}/correct`  | Agent intent correction                                  |
| `POST` | `/agent/call/{call_id}/escalate` | Manual escalation                                        |
| `GET`  | `/agent/calls/latest`            | Recent calls list                                        |
| `GET`  | `/agent/stats`                   | Aggregate dashboard statistics                           |

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# Database
POSTGRES_URL=postgresql://user:password@localhost:5432/dial_db

# Cache / Pub-Sub
REDIS_URL=redis://localhost:6379

# AI Models
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-lite
GEMINI_TIMEOUT_SECONDS=5

# Tuning
VAD_THRESHOLD=0.5
CONFIDENCE_THRESHOLD=0.65
MAX_ATTEMPTS=2
```

For the frontend, create `d.i.a.l.-agent-dashboard/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
APP_URL=http://localhost:3000
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Set up the database
psql -U user -d dial_db -f dial_backend/sql/schema.sql

# Start the server
uvicorn dial_backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will initialize all models on startup. Check `/health/full` to confirm all components are ready.

### Frontend (Agent Dashboard)

```bash
cd d.i.a.l.-agent-dashboard

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The dashboard runs on `http://localhost:3000`.

---

## ✨ Novelty Features

**Dialect Fingerprinting Within a Call** - the system silently accumulates dialect signal hits across turns, improving accuracy mid-call without any extra input from the citizen or agent.

**Live Confidence Nudge** - the agent dashboard shows a real-time confidence bar while the AI is summarizing. If confidence drops below threshold, the agent is nudged to intervene before the citizen confirms a wrong summary.

**Cross-Call Clustering** - similar complaints across multiple calls are grouped in real time using HDBSCAN + SBERT embeddings, surfacing systemic civic issues (e.g., 12 water supply complaints from the same grid within 90 minutes) before they escalate.

---

## 📄 License

[MIT](LICENSE)
