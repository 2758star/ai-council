from __future__ import annotations

import os

import requests


def get_webhook_url() -> str | None:
    return os.getenv("FEISHU_WEBHOOK_URL")


def send_text_message(text: str) -> tuple[bool, str]:
    webhook_url = get_webhook_url()
    if not webhook_url:
        return False, "FEISHU_WEBHOOK_URL is not set."

    payload = {"msg_type": "text", "content": {"text": text}}
    response = requests.post(webhook_url, json=payload, timeout=10)
    if response.ok:
        return True, "Message delivered to Feishu."
    return False, f"Feishu request failed: {response.status_code} {response.text}"
