from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional, Tuple


@dataclass
class CallState:
    """State tracker for a single call session."""

    call_id: str
    confidence_score: float = 100.0
    human_intervention: bool = False
    last_ai_question: Optional[str] = None
    repeated_question_count: int = 0
    last_responses: list[str] = field(default_factory=list)
    consecutive_no_count: int = 0
    high_distress_triggered: bool = False
    history: list[Dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)


class ConfidenceEngine:
    """
    Tracks confidence score for voice AI agent calls.
    Implements three logic modules: Turn Tracking, Confirmation Tracker, Sentiment Integration.
    """

    YES_PHRASES = {"yes", "yeah", "yep", "sure", "okay", "ok", "affirmative", "correct"}
    NO_PHRASES = {"no", "nope", "nah", "don't", "cant", "cannot", "negative", "wrong"}

    def __init__(self, state_backend: str = "local") -> None:
        """
        Initialize the confidence engine.

        Args:
            state_backend: "local" for in-memory dict, "redis" for Redis (future).
        """
        self.state_backend = state_backend
        self.call_states: Dict[str, CallState] = {}

    async def update_score(
        self,
        call_id: str,
        stt_text: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[float, bool]:
        """
        Update confidence score based on STT text and metadata.

        Args:
            call_id: Unique identifier for the call session.
            stt_text: Transcribed user speech.
            metadata: Dict with optional keys:
                - current_question (str): The question the AI just asked.
                - high_distress (bool): True if high distress detected.
                - sentiment_score (float): Sentiment value (-1.0 to 1.0).

        Returns:
            Tuple of (current_score, escalate_boolean).
        """
        if metadata is None:
            metadata = {}

        if call_id not in self.call_states:
            self.call_states[call_id] = CallState(call_id=call_id)

        state = self.call_states[call_id]

        await self._apply_turn_tracking(state, metadata)
        await self._apply_confirmation_tracker(state, stt_text)
        await self._apply_sentiment_integration(state, metadata)

        escalate = state.confidence_score < 40
        if escalate:
            state.human_intervention = True

        state.history.append(
            {
                "timestamp": datetime.now().isoformat(),
                "stt_text": stt_text,
                "confidence_score": state.confidence_score,
                "escalated": escalate,
            }
        )

        return state.confidence_score, escalate

    async def _apply_turn_tracking(
        self, state: CallState, metadata: Dict[str, Any]
    ) -> None:
        """
        Track if the AI asks the same question twice.
        Subtract 20 points for every repeated question.
        """
        current_question = metadata.get("current_question")

        if current_question:
            current_normalized = self._normalize_question(current_question)
            last_normalized = (
                self._normalize_question(state.last_ai_question)
                if state.last_ai_question
                else None
            )

            if current_normalized and last_normalized == current_normalized:
                state.repeated_question_count += 1
                penalty = 20 * state.repeated_question_count
                state.confidence_score = max(0, state.confidence_score - penalty)
            else:
                state.last_ai_question = current_question
                state.repeated_question_count = 0

    async def _apply_confirmation_tracker(self, state: CallState, stt_text: str) -> None:
        """
        Monitor yes/no responses.
        If user says 'No' 2 times in a row, subtract 30 points.
        """
        normalized_text = stt_text.lower().strip()
        response = self._extract_yes_no(normalized_text)

        if response:
            state.last_responses.append(response)
            if len(state.last_responses) > 2:
                state.last_responses.pop(0)

            if (
                len(state.last_responses) >= 2
                and state.last_responses[-2:] == ["no", "no"]
            ):
                state.consecutive_no_count += 1
                penalty = 30
                state.confidence_score = max(0, state.confidence_score - penalty)

    async def _apply_sentiment_integration(
        self, state: CallState, metadata: Dict[str, Any]
    ) -> None:
        """
        Accept sentiment_score and high_distress flag from external audio analyzer.
        Subtract 40 points immediately if high_distress is detected (only once).
        """
        high_distress = metadata.get("high_distress", False)

        if high_distress and not state.high_distress_triggered:
            state.confidence_score = max(0, state.confidence_score - 40)
            state.high_distress_triggered = True

    def get_call_state(self, call_id: str) -> Optional[CallState]:
        """Retrieve the current state of a call."""
        return self.call_states.get(call_id)

    def get_call_summary(self, call_id: str) -> Optional[Dict[str, Any]]:
        """Get a summary of the call state."""
        state = self.get_call_state(call_id)
        if not state:
            return None

        return {
            "call_id": state.call_id,
            "confidence_score": state.confidence_score,
            "human_intervention": state.human_intervention,
            "repeated_question_count": state.repeated_question_count,
            "consecutive_no_count": state.consecutive_no_count,
            "high_distress_triggered": state.high_distress_triggered,
            "call_duration": (datetime.now() - state.created_at).total_seconds(),
            "events_count": len(state.history),
        }

    def reset_call(self, call_id: str) -> None:
        """Reset or clear a call state."""
        if call_id in self.call_states:
            del self.call_states[call_id]

    def _normalize_question(self, question: str) -> str:
        """Normalize a question for comparison (lowercase, remove punctuation)."""
        if not question:
            return ""
        text = question.lower().strip()
        text = re.sub(r"[^\w\s]", "", text)
        words = text.split()
        return " ".join(sorted(words))

    def _extract_yes_no(self, text: str) -> Optional[str]:
        """Extract yes/no response from normalized text."""
        for phrase in self.YES_PHRASES:
            if phrase in text:
                return "yes"
        for phrase in self.NO_PHRASES:
            if phrase in text:
                return "no"
        return None
