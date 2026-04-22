"""
==============================================================================
 WOWE Backend - IR Command Queue (backend/state/ir_queue.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - Maintain a small per-device FIFO queue of IR commands.
 - Track pending commands waiting for ACK from ESP32.
 - Provide async wait mechanism for command completion.

 Design:
 - Thread-safe in-memory queues (lost on restart).
 - Uses asyncio.Event to wait for ACKs.
==============================================================================
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4


@dataclass(frozen=True)
class IrMessage:
    message_id: str
    device_id: str
    ui_cmd: str
    ir_code: int
    created_at: datetime


_lock = Lock()
_queues: dict[str, list[IrMessage]] = {}
# Track pending commands waiting for ACK: {message_id: asyncio.Event}
_pending_acks: dict[str, asyncio.Event] = {}


def _norm_device_id(device_id: str) -> str:
    """Normalize device_id to a consistent queue key (lowercase, trimmed)."""
    return (device_id or "").strip().lower()


def enqueue(*, device_id: str, ui_cmd: str, ir_code: int) -> IrMessage:
    """
    Enqueue a new IR message for a device and create an Event for ACK tracking.

    Args:
        device_id: target robot/device identifier (e.g. "alpha")
        ui_cmd: original UI command string (for debugging)
        ir_code: IR command byte (0..255)

    Returns:
        IrMessage with message_id that can be used to wait for ACK
    """
    if not (0 <= int(ir_code) <= 255):
        raise ValueError("ir_code must be 0..255")

    normalized = _norm_device_id(device_id)
    if not normalized:
        raise ValueError("device_id is required")

    msg = IrMessage(
        message_id=str(uuid4()),
        device_id=normalized,
        ui_cmd=str(ui_cmd),
        ir_code=int(ir_code),
        created_at=datetime.now(timezone.utc),
    )

    with _lock:
        _queues.setdefault(normalized, []).append(msg)
        # Create an Event for this message to wait for ACK
        _pending_acks[msg.message_id] = asyncio.Event()

    return msg


def pop_next(*, device_id: str) -> IrMessage | None:
    """Pop (FIFO) the next queued IR message for a device, or None if empty."""
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

