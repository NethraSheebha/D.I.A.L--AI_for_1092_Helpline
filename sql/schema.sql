CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE calls (
    call_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    outcome         VARCHAR(20),
    final_intent    JSONB,
    dominant_dialect VARCHAR(30),
    total_turns     INT DEFAULT 0
);

CREATE TABLE turns (
    turn_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id         UUID REFERENCES calls(call_id),
    turn_number     INT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transcript      TEXT,
    detected_lang   VARCHAR(10),
    intent_raw      JSONB,
    sentiment_raw   JSONB,
    confidence      FLOAT,
    verification_sent BOOLEAN DEFAULT FALSE,
    citizen_confirmed VARCHAR(20),
    agent_corrected BOOLEAN DEFAULT FALSE,
    corrected_intent JSONB
);

CREATE TABLE escalations (
    escalation_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id         UUID REFERENCES calls(call_id),
    reason          VARCHAR(30),
    escalated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    context_snapshot JSONB
);

CREATE TABLE feedback (
    feedback_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turn_id         UUID REFERENCES turns(turn_id),
    signal          VARCHAR(20),
    original_intent JSONB,
    corrected_intent JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON turns(call_id);
CREATE INDEX ON turns(detected_lang);
CREATE INDEX ON turns(confidence);
CREATE INDEX ON escalations(call_id);
CREATE INDEX ON feedback(signal);
