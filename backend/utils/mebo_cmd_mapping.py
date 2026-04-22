"""
==============================================================================
MEBO Backend - Command Mapping (backend/utils/mebo_cmd_mapping.py)

Author:   M. Suleman Anwar
Date:     2026-01-15

Purpose:
- Map UI command strings to MEBO robot Arduino character commands.
- Keeps backend routing logic clean and centralized.

Notes:
- These commands are based on the Arduino Nano motor_drive_call() function.
- Commands are single characters sent via ESP32 serial to Arduino.
- You can adjust any mapping here without touching routes/UI.
==============================================================================
"""

from __future__ import annotations


# UI command string -> Arduino character command
# Based on Arduino code:
# - 'f'/'F' = Move forward
# - 'r'/'R' = Move reverse
# - 's'/'S' = Stop
# - 'l'/'L' = Rotate left
# - 'z'/'Z' = Rotate right
# - '5' = Claw open
# - '6' = Claw close
# - '7' = Rotate CW
# - '8' = Rotate CCW
# - '9' = Joint 1 down
# - 'a' = Joint 1 up
# - 'b' = Joint 2 up
# - 'c' = Joint 2 down

UI_TO_ARDUINO: dict[str, str] = {
    # ------------------ MOVEMENT ------------------
    "mebo_forward": "f",
    "mebo_reverse": "r",
    "mebo_stop": "s",
    "mebo_rotate_left": "l",
    "mebo_rotate_right": "z",

    # ------------------ CLAW ------------------
    "mebo_claw_open": "5",
    "mebo_claw_close": "6",

    # ------------------ ROTATION ------------------
    "mebo_rotate_cw": "7",
    "mebo_rotate_ccw": "8",

    # ------------------ JOINTS ------------------
    "mebo_joint1_up": "a",
    "mebo_joint1_down": "9",
    "mebo_joint2_up": "b",
    "mebo_joint2_down": "c",
}


def try_get_arduino_cmd(*, ui_cmd: str) -> str | None:
    """Return Arduino character command for a UI command, or None if unmapped."""
    key = (ui_cmd or "").strip().lower()
    if not key:
        return None
    return UI_TO_ARDUINO.get(key)
