import os
import re
from dataclasses import dataclass, field
from queue import Queue
from threading import Thread
from typing import Dict, Generator, List, Optional
import google.api_core.exceptions
from google import genai
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
from fastapi import APIRouter, WebSocket
from modules.stt import IndicConformerSTT
from modules.tts import IndicParlerTTS
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Initialize models lazily
stt_model = None
tts_model = None


@dataclass
class ConversationState:
    session_id: Optional[str] = None
    collected_fields: Dict[str, str] = field(default_factory=lambda: {
        "name": "",
        "locality": "",
        "address": "",
        "issue": "",
    })
    history: List[Dict[str, str]] = field(default_factory=list)


class Gemma4Agent:
    """Gemma4 assistant wrapper with verification and streaming response support."""

    def __init__(
        self,
        model_name: str = "gemma4",
        device: int = -1,
        max_new_tokens: int = 256,
        client: genai.Client = None,
    ) -> None:
        self.model_name = model_name
        self.client = client or genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.device = device
        self.max_new_tokens = max_new_tokens

        # Lazy loading placeholders
        self.tokenizer = None
        self.model = None

        self.state = ConversationState()

    def _ensure_local_model(self):
        """Lazy load the local model if needed as a fallback."""
        if self.model is None:
            print(f"[LLM] Loading local fallback model: {self.model_name}...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name, use_fast=True)
            self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
            if self.device != -1 and torch.cuda.is_available():
                self.model = self.model.to(self.device)

    def stream_response(self, user_text: str) -> Generator[str, None, None]:
        """Generate a token stream for the next agent response."""
        self._update_slots(user_text)
        prompt = self._build_prompt(user_text)

        try:
            # PRIMARY: Gemini Flash API
            response = self.client.models.generate_content(
                model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash-lite"),
                contents=prompt
            )
            yield response.text
        except Exception as e:
            print(f"Gemini failed: {e}. Switching to local Gemma fallback.")
            self._ensure_local_model()
            input_ids = self.tokenizer(prompt, return_tensors="pt").input_ids
            if self.device != -1 and torch.cuda.is_available():
                input_ids = input_ids.to(self.device)

            streamer = TextIteratorStreamer(
                self.tokenizer,
                skip_prompt=True,
                skip_special_tokens=True,
                timeout=10.0,
            )

            thread = Thread(
                target=self.model.generate,
                kwargs={
                    "input_ids": input_ids,
                    "max_new_tokens": self.max_new_tokens,
                    "temperature": 0.7,
                    "do_sample": True,
                    "streamer": streamer,
                },
            )
            thread.start()

            for new_text in streamer:
                if new_text.strip():
                    yield new_text

            thread.join()
        self.state.history.append({"user": user_text, "assistant_prompt": prompt})

    def get_last_question(self) -> str:
        """Get the last question asked by the AI."""
        if self.state.collected_fields["name"]:
            return "name"
        if self.state.collected_fields["locality"]:
            return "locality"
        if self.state.collected_fields["address"]:
            return "address"
        if self.state.collected_fields["issue"]:
            return "issue"
        return "initial"

    def _build_prompt(self, user_text: str) -> str:
        summary = self._build_state_summary()
        next_step = self._next_step_description()

        prompt = (
            "You are a professional civic helpline assistant."
            " Use a polite, structured verification flow."
            " After the user provides a detail, repeat it back clearly and ask the next required detail."
            " Do not move on until the user confirms."
            " When all required details are collected, summarize them and ask for final confirmation before proceeding.\n\n"
            f"Current collected details:\n{summary}\n\n"
            f"User input: {user_text}\n\n"
            f"Assistant instructions: {next_step}\n"
            "Answer as the next spoken assistant turn."
        )
        return prompt

    def _build_state_summary(self) -> str:
        parts = []
        for key, value in self.state.collected_fields.items():
            parts.append(f"- {key.capitalize()}: {value or '<not provided>'}")
        return "\n".join(parts)

    def _next_step_description(self) -> str:
        if not self.state.collected_fields["name"]:
            return "Confirm the user name and ask for the locality."
        if not self.state.collected_fields["locality"]:
            return "Confirm the locality and ask for the address."
        if not self.state.collected_fields["address"]:
            return "Confirm the address and ask for the issue description."
        if not self.state.collected_fields["issue"]:
            return "Confirm the issue and ask if the details are ready for final verification."
        return "Summarize all collected details and ask the user to confirm before filing the report."

    def _update_slots(self, user_text: str) -> None:
        normalized = user_text.strip()
        if not self.state.collected_fields["name"]:
            name = self._extract_name(normalized)
            if name:
                self.state.collected_fields["name"] = name
                return
        if self.state.collected_fields["name"] and not self.state.collected_fields["locality"]:
            locality = self._extract_locality(normalized)
            if locality:
                self.state.collected_fields["locality"] = locality
                return
        if self.state.collected_fields["locality"] and not self.state.collected_fields["address"]:
            address = self._extract_address(normalized)
            if address:
                self.state.collected_fields["address"] = address
                return
        if self.state.collected_fields["address"] and not self.state.collected_fields["issue"]:
            issue = self._extract_issue(normalized)
            if issue:
                self.state.collected_fields["issue"] = issue

    def _extract_name(self, text: str) -> str | None:
        match = re.search(r"(?:my name is|I am|this is)\s+([A-Za-z\u0900-\u097F\s]+)", text, re.I)
        if match:
            return match.group(1).strip()
        return None

    def _extract_locality(self, text: str) -> str | None:
        match = re.search(r"(?:in|at|from)\s+([A-Za-z\u0900-\u097F\s]+)", text, re.I)
        if match:
            return match.group(1).strip()
        return None

    def _extract_address(self, text: str) -> str | None:
        if len(text.split()) >= 3:
            return text.strip()
        return None

    def _extract_issue(self, text: str) -> str | None:
        if len(text) > 10:
            return text.strip()
        return None
