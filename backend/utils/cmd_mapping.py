"""
==============================================================================
 WOWE Backend - Command Mapping (backend/utils/cmd_mapping.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - Map UI command strings to WOWE robot IR hex codes (8-bit).
 - Keeps backend routing logic clean and centralized.

 Notes:
 - These IR codes are based on your provided command table in the ESP32 IR firmware.
 - You can adjust any mapping here without touching routes/UI.
==============================================================================
"""

from __future__ import annotations


# UI command string -> IR byte (0x00-0xFF)
# Movement:
# - up/down/left/right/stop/halt are used by the web UI.
UI_TO_IR: dict[str, int] = {
    # ------------------ BASIC MOVEMENT ------------------
    "up": 0x86,  # walkForward
    "down": 0x87,  # walkBackward
    "right": 0x80,  # turnRight
    "left": 0x88,  # turnLeft
    "stop": 0x8E,  # stopAll
    "halt": 0x8E,  # global halt -> stopAll

    # ------------------ ACTION BUTTONS (UI) ------------------
    "pick_up": 0xA4,  # rightHandPickup
    "throw": 0xA2,  # rightHandThrow
    "strike": 0xC5,  # rightStrike1 (example mapping)
    "burp": 0xC2,  # burp
    "boar": 0xC6,  # bulldozer (closest "boar-like" action)
    "roar": 0xCE,  # roar
}


def try_get_ir_code(*, ui_cmd: str) -> int | None:
    """Return IR code for a UI command, or None if unmapped."""
    key = (ui_cmd or "").strip().lower()
    if not key:
        return None
    return UI_TO_IR.get(key)

