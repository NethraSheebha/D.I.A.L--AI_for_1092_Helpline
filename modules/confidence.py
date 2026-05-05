from typing import Dict, Optional, Tuple
import numpy as np
from sklearn.linear_model import LogisticRegression
import os

CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.65"))
MAX_ATTEMPTS = int(os.getenv("MAX_ATTEMPTS", "2"))

IPL_MULTIPLIERS = {
    1: 1.00,  # calm
    2: 0.92,  # confused
    3: 0.84,  # urgent
    4: 0.72,  # distressed
    5: 0.55   # panicked
}

class ConfidenceScorer:
    def __init__(self):
        self.model = None
        self.scaler = None
        
    async def initialize(self):
        self.model = LogisticRegression(max_iter=100)
        self.model.classes_ = np.array([0, 1])
    
    def compute_confidence(self, intent: Dict, sentiment: Dict, attempt: int) -> float:
        """
        Combines three signals into a single [0, 1] confidence score.
        
        Signal 1 — NLU confidence (weight: 60%)
          How certain the intent classifier is about its top label.
          Source: intent["confidence"] from zero-shot classifier.
        
        Signal 2 — Sentiment stability (weight: 30%)
          High distress = lower effective confidence because
          the citizen may not be speaking clearly.
          IPL 1 (calm) → 1.0 multiplier
          IPL 2 (confused) → 0.92
          IPL 3 (urgent) → 0.84
          IPL 4 (distressed) → 0.72
          IPL 5 (panicked) → 0.55
        
        Signal 3 — Attempt penalty (weight: 10%)
          Each failed attempt reduces confidence by 0.1.
          Ensures escalation after MAX_ATTEMPTS.
        """
        nlu_conf = intent.get("confidence", 0.5)
        ipl = sentiment.get("ipl", 1)
        
        sentiment_weight = IPL_MULTIPLIERS.get(ipl, 1.0)
        attempt_penalty = attempt * 0.10
        
        score = (nlu_conf * 0.60) + (sentiment_weight * 0.30) - attempt_penalty
        
        final_score = round(max(0.0, min(1.0, score)), 4)
        
        print(f"📊 Confidence: NLU={nlu_conf:.2f} IPL={ipl} SENT={sentiment_weight:.2f} ATTEMPT_PEN={attempt_penalty:.2f} = {final_score:.4f}")
        
        return final_score
    
    def should_escalate(self, confidence: float, sentiment: Dict, attempt: int) -> Tuple[bool, str]:
        """
        Returns (escalate: bool, reason: str)
        Reasons: "low_confidence", "high_distress", "max_attempts", "panic_detected"
        """
        ipl = sentiment.get("ipl", 1)
        
        if ipl == 5:
            return True, "panic_detected"
        
        if attempt >= MAX_ATTEMPTS:
            return True, "max_attempts"
        
        if confidence < CONFIDENCE_THRESHOLD:
            return True, "low_confidence"
        
        return False, ""
    
    async def compute_score(self,
                           nlu_intent_confidence: float,
                           sentiment_distress_score: float,
                           attempt_count: int,
                           sentiment_dict: Optional[Dict] = None,
                           nlu_entities: Optional[Dict] = None) -> Dict:
        """Legacy API for compatibility"""
        intent = {"confidence": nlu_intent_confidence}
        sentiment = sentiment_dict or {"ipl": max(1, int(4 * sentiment_distress_score))}
        
        confidence = self.compute_confidence(intent, sentiment, attempt_count)
        escalate, reason = self.should_escalate(confidence, sentiment, attempt_count)
        
        return {
            "confidence": confidence,
            "escalate": escalate,
            "reason": reason,
            "ipl": sentiment.get("ipl", 1)
        }
    
    async def train_model(self, training_data: np.ndarray, labels: np.ndarray):
        if self.model is not None and len(training_data) > 0:
            self.model.fit(training_data, labels)
