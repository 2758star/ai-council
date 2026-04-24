from __future__ import annotations

import mimetypes
from pathlib import Path

try:
    from docx import Document
except ImportError:  # pragma: no cover
    Document = None

from applimate.config import VAULT_CATEGORIES
from applimate.db import create_file_record


def safe_destination(category: str, file_name: str) -> Path:
    base_dir = VAULT_CATEGORIES[category]
    candidate = base_dir / Path(file_name).name
    stem = candidate.stem
    suffix = candidate.suffix
    counter = 1

    while candidate.exists():
        candidate = base_dir / f"{stem}_{counter}{suffix}"
        counter += 1

    return candidate


def persist_uploaded_file(category: str, uploaded_file) -> tuple[Path, str]:
    destination = safe_destination(category, uploaded_file.name)
    destination.write_bytes(uploaded_file.getbuffer())
    mime_type, _ = mimetypes.guess_type(destination.name)
    return destination, mime_type or "application/octet-stream"


def detect_preview_kind(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".png", ".jpg", ".jpeg", ".gif", ".webp"}:
        return "image"
    if suffix in {".mp4", ".mov", ".m4v", ".webm"}:
        return "video"
    if suffix in {".mp3", ".wav", ".m4a", ".aac"}:
        return "audio"
    if suffix in {".txt", ".md", ".py", ".json", ".log"}:
        return "text"
    if suffix == ".csv":
        return "csv"
    if suffix == ".pdf":
        return "pdf"
    if suffix == ".docx":
        return "docx"
    return "unknown"


def read_text_excerpt(path: Path, limit: int = 4000) -> str:
    try:
        return path.read_text(encoding="utf-8")[:limit]
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="ignore")[:limit]


def read_docx_excerpt(path: Path, limit: int = 4000) -> str:
    if Document is None:
        return "DOCX preview requires python-docx. Install dependencies with: pip install -r requirements.txt"
    document = Document(path)
    content = "\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text.strip())
    return content[:limit] or "This DOCX file has no extractable text content."


def sync_vault_to_database() -> int:
    synced = 0
    for category, base_dir in VAULT_CATEGORIES.items():
        for file_path in base_dir.rglob("*"):
            if not file_path.is_file():
                continue
            mime_type, _ = mimetypes.guess_type(file_path.name)
            create_file_record(
                file_name=file_path.name,
                local_path=str(file_path),
                category=category,
                file_type=mime_type or "application/octet-stream",
                linked_app_id=None,
                note="",
            )
            synced += 1
    return synced
