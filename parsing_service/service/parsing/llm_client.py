"""
LLM Client - OpenAI Responses
"""

from __future__ import annotations

import base64
import json
import os
from typing import Any, Dict, Optional

import requests


class LlmClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.prompt_id = os.getenv("PARSING_PROMPT_ID")
        self.prompt_version = os.getenv("PARSING_PROMPT_VERSION")
        self.json_instructions = os.getenv("PARSING_JSON_INSTRUCTIONS", "Return JSON only.")

        if not self.api_key:
            raise ValueError("Missing OPENAI_API_KEY environment variable")
        if not self.prompt_id:
            raise ValueError("Missing PARSING_PROMPT_ID environment variable")

    def parse_profile_from_text(self, content_text: str, hint_text: str = "") -> Dict[str, Any]:
        if self.prompt_id:
            variables = {"content": content_text}
            hint_parts = [self.json_instructions]
            if hint_text:
                hint_parts.append(hint_text)
            variables["hint"] = " ".join(hint_parts).strip()
            return self._call_openai(input_messages=[], prompt=self._build_prompt(variables))

    def parse_profile_from_image(self, image_bytes: bytes, mime_type: str, hint_text: str = "") -> Dict[str, Any]:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        image_part = {
            "type": "input_image",
            "image_url": f"data:{mime_type};base64,{b64}",
        }

        if self.prompt_id:
            variables = {"content": image_part}
            hint_parts = [self.json_instructions]
            if hint_text:
                hint_parts.append(hint_text)
            variables["hint"] = " ".join(hint_parts).strip()
            return self._call_openai(input_messages=[], prompt=self._build_prompt(variables))

    def _build_prompt(self, variables: Dict[str, Any]) -> Dict[str, Any]:
        prompt: Dict[str, Any] = {"id": self.prompt_id, "variables": variables}
        if self.prompt_version:
            prompt["version"] = self.prompt_version
        return prompt

    def _call_openai(
        self,
        input_messages: Optional[list] = None,
        prompt: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/responses"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "temperature": 0,
            "text": {"format": {"type": "json_object"}},
        }
        if prompt:
            payload["prompt"] = prompt
        if input_messages is not None:
            payload["input"] = input_messages

        # Responses API requires the word "json" in input when using json_object.
        if payload.get("text", {}).get("format", {}).get("type") == "json_object":
            if not payload.get("input"):
                payload["input"] = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "input_text", "text": "json"}
                        ],
                    }
                ]

        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        if resp.status_code != 200:
            raise RuntimeError(f"OpenAI API error {resp.status_code}: {resp.text}")

        data = resp.json()
        content = data.get("output_text")
        if not content:
            try:
                content = data["output"][0]["content"][0]["text"]
            except Exception as e:
                raise RuntimeError(f"Unexpected Responses API payload: {e}")
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse JSON from LLM: {e}")
