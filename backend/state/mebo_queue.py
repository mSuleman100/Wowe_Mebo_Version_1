"""
==============================================================================
MEBO Backend - MEBO Command Queue (backend/state/mebo_queue.py)

Author:   M. Suleman Anwar
Date:     2026-01-15

Purpose:
- Maintain a small per-device FIFO queue of MEBO commands (character commands).
- Track pending commands waiting for ACK from ESP32.
- Provide async wait mechanism for command completion.

Design:
- Thread-safe in-memory queues (lost on restart).
- Uses asyncio.Event to wait for ACKs.
- Commands are single characters (e.g., 's', 'f', 'r') sent to Arduino via ESP32.
==============================================================================
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock
from typing import TYPE_CHECKING
from uuid import uuid4

if TYPE_CHECKING:
    from fastapi import WebSocket


@dataclass(frozen=True)
class MeboMessage:
    message_id: str
    device_id: str
    ui_cmd: str
    arduino_cmd: str  # Single character command (e.g., 's', 'f', 'r')
    created_at: datetime


_lock = Lock()
_queues: dict[str, list[MeboMessage]] = {}
_pending_acks: dict[str, asyncio.Event] = {}
_ws_connections: dict[str, "WebSocket"] = {}


def register_ws(*, device_id: str, ws: "WebSocket") -> None:
    _ws_connections[_norm_device_id(device_id)] = ws


def unregister_ws(*, device_id: str) -> None:
    _ws_connections.pop(_norm_device_id(device_id), None)


def get_ws(*, device_id: str) -> "WebSocket | None":
    return _ws_connections.get(_norm_device_id(device_id))


def _norm_device_id(device_id: str) -> str:
    """Normalize device_id to a consistent queue key (lowercase, trimmed)."""
    return (device_id or "").strip().lower()


def enqueue(*, device_id: str, ui_cmd: str, arduino_cmd: str) -> MeboMessage:
    """
    Enqueue a new MEBO message for a device and create an Event for ACK tracking.

    Args:
        device_id: target robot/device identifier (e.g. "alpha")
        ui_cmd: original UI command string (for debugging)
        arduino_cmd: Arduino character command (single character, e.g., 's', 'f', 'r')

    Returns:
        MeboMessage with message_id that can be used to wait for ACK
    """
    if not arduino_cmd or len(arduino_cmd) != 1:
        raise ValueError("arduino_cmd must be a single character")

    normalized = _norm_device_id(device_id)
    if not normalized:
        raise ValueError("device_id is required")

    msg = MeboMessage(
        message_id=str(uuid4()),
        device_id=normalized,
        ui_cmd=str(ui_cmd),
        arduino_cmd=str(arduino_cmd),
        created_at=datetime.now(timezone.utc),
    )

    with _lock:
        _queues.setdefault(normalized, []).append(msg)
        # Create an Event for this message to wait for ACK
        _pending_acks[msg.message_id] = asyncio.Event()

    return msg


def pop_next(*, device_id: str) -> MeboMessage | None:
    """Pop (FIFO) the next queued MEBO message for a device, or None if empty."""
    normalized = _norm_device_id(device_id)
    if not normalized:
        return None

    with _lock:
        q = _queues.get(normalized) or []
        if not q:
            return None
        return q.pop(0)


def get_depth(*, device_id: str) -> int:
    """Return the current queue depth for a device."""
    normalized = _norm_device_id(device_id)
    if not normalized:
        return 0
    with _lock:
        return len(_queues.get(normalized) or [])


def clear_queue(*, device_id: str) -> int:
    """
    Clear all pending commands for a device (useful when stop is sent).

    Args:
        device_id: target robot/device identifier

    Returns:
        Number of commands that were cleared
    """
    normalized = _norm_device_id(device_id)
    if not normalized:
        return 0

    with _lock:
        q = _queues.get(normalized, [])
        count = len(q)
        if count > 0:
            # Clear the queue
            _queues[normalized] = []
            # Also clear pending ACKs for these messages
            for msg in q:
                _pending_acks.pop(msg.message_id, None)
        return count


def mark_ack_received(*, message_id: str) -> bool:
    """
    Mark a command as acknowledged by ESP32.

    Args:
        message_id: The message_id from the ACK request

    Returns:
        True if message_id was found and ACK was set, False otherwise
    """
    with _lock:
        event = _pending_acks.get(message_id)
        if event:
            event.set()
            return True
    return False


async def wait_for_ack(*, message_id: str, timeout_seconds: float = 5.0) -> bool:
    """
    Wait for an ACK for a given message_id.

    Args:
        message_id: The message_id to wait for
        timeout_seconds: Maximum time to wait (default: 5 seconds)

    Returns:
        True if ACK received within timeout, False if timeout
    """
    with _lock:
        event = _pending_acks.get(message_id)
        if not event:
            # Message already ACK'd or doesn't exist
            return False

    try:
        await asyncio.wait_for(event.wait(), timeout=timeout_seconds)
        return True
    except asyncio.TimeoutError:
        return False
    finally:
        # Clean up the event after use
        with _lock:
            _pending_acks.pop(message_id, None)

