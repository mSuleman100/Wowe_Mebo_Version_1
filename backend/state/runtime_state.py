"""
==============================================================================
 WOWE Backend - Runtime State (backend/state/runtime_state.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - Keep lightweight runtime state for debugging:
     - last command received
     - last sequence received

 Notes:
 - This is NOT durable storage (lost on restart).
 - Used by /debug/state and useful during ESP32 integration.
==============================================================================
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class RuntimeState:
    last_cmd: str | None = None
    last_cmd_at: datetime | None = None
    last_sequence: list[str] = field(default_factory=list)
    last_sequence_at: datetime | None = None


STATE = RuntimeState()


def set_last_cmd(*, cmd: str) -> None:
    """Store the last command and timestamp (debug support)."""
    STATE.last_cmd = cmd
    STATE.last_cmd_at = datetime.now(timezone.utc)


def set_last_sequence(*, steps: list[str]) -> None:
    """Store the last sequence and timestamp (debug support)."""
    STATE.last_sequence = steps
    STATE.last_sequence_at = datetime.now(timezone.utc)

