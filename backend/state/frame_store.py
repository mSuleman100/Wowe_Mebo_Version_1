"""
==============================================================================
 WOWE Backend - In-Memory Frame Store (backend/state/frame_store.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - Store the latest uploaded JPEG frame per feed_id (alpha/bravo/charlie/delta).
 - Used by:
     - POST /video/{feed_id}/upload  -> put_frame()
     - GET  /video/{feed_id}         -> get_frame()

 Notes:
 - This is an in-memory store (frames are lost on restart).
 - Designed for simplicity and low latency during development.
==============================================================================
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock


@dataclass(frozen=True)
class StoredFrame:
    jpeg_bytes: bytes
    received_at: datetime


_lock = Lock()
_frames: dict[str, StoredFrame] = {}


def _normalize_feed_id(feed_id: str) -> str:
    """Normalize feed_id to a consistent dictionary key."""
    return (feed_id or "").strip().lower()


def put_frame(*, feed_id: str, jpeg_bytes: bytes) -> None:
    """Store the latest JPEG bytes for a given feed_id."""
    normalized = _normalize_feed_id(feed_id)
    if not normalized:
        raise ValueError("feed_id is required")
    if not jpeg_bytes:
        raise ValueError("jpeg_bytes is required")

    stored = StoredFrame(jpeg_bytes=jpeg_bytes, received_at=datetime.now(timezone.utc))
    with _lock:
        _frames[normalized] = stored


def get_frame(*, feed_id: str) -> StoredFrame | None:
    """Read the latest stored frame for a given feed_id (or None if not present)."""
    normalized = _normalize_feed_id(feed_id)
    if not normalized:
        return None

    with _lock:
        return _frames.get(normalized)

