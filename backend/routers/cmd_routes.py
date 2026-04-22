"""
==============================================================================
 WOWE Backend - Command Routes (backend/routers/cmd_routes.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - Receive control commands from the web UI:
     - WOWE: movement (up/down/left/right/stop/halt), actions (pick_up/throw/etc)
     - MEBO: commands prefixed with "mebo_" (mebo_stop, mebo_forward, etc.)

 Notes:
 - Routes WOWE commands to IR queue
 - Routes MEBO commands to MEBO queue
 - Completely separate command handling for each robot type
==============================================================================
"""

from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

from backend.state.ir_queue import enqueue as enqueue_ir
from backend.state.mebo_queue import clear_queue as clear_mebo_queue, enqueue as enqueue_mebo, get_ws, unregister_ws
from backend.state.runtime_state import set_last_cmd
from backend.types.schemas import CommandResponse
from backend.utils.cmd_mapping import try_get_ir_code
from backend.utils.mebo_cmd_mapping import try_get_arduino_cmd

router = APIRouter()


_ALLOWED_WOWE_CMDS = {
    "up",
    "down",
    "left",
    "right",
    "stop",
    "halt",
    "pick_up",
    "throw",
    "strike",
    "burp",
    "boar",
    "roar",
}

# MEBO commands are prefixed with "mebo_"
_ALLOWED_MEBO_CMDS = {
    "mebo_forward",
    "mebo_reverse",
    "mebo_stop",
    "mebo_rotate_left",
    "mebo_rotate_right",
    "mebo_claw_open",
    "mebo_claw_close",
    "mebo_rotate_cw",
    "mebo_rotate_ccw",
    "mebo_joint1_up",
    "mebo_joint1_down",
    "mebo_joint2_up",
    "mebo_joint2_down",
}


@router.post("/cmd/{cmd}", response_model=CommandResponse)
async def post_cmd(cmd: str, device_id: str = Query(default="alpha", description="Robot device ID")) -> CommandResponse:
    """
    Validate a command and route it to the appropriate queue.

    - WOWE commands: routed to IR queue
    - MEBO commands (prefixed with "mebo_"): routed to MEBO queue
    """
    cmd_lower = cmd.strip().lower()

    # Check if it's a MEBO command
    if cmd_lower.startswith("mebo_"):
        if cmd_lower not in _ALLOWED_MEBO_CMDS:
            raise HTTPException(status_code=400, detail=f"Unknown MEBO command: {cmd}")

        # Store for debugging
        set_last_cmd(cmd=cmd)

        # If stop command, clear the queue first to prevent backlog
        if cmd_lower == "mebo_stop":
            cleared = clear_mebo_queue(device_id=device_id)
            if cleared > 0:
                import logging
                logger = logging.getLogger("uvicorn.error")
                logger.info(f"MEBO queue cleared: {cleared} commands removed for device={device_id}")

        arduino_cmd = try_get_arduino_cmd(ui_cmd=cmd_lower)
        if arduino_cmd is None:
            raise HTTPException(status_code=400, detail=f"MEBO command not mapped: {cmd}")

        # Push instantly via WebSocket if ESP32 is connected, else fall back to queue
        ws = get_ws(device_id=device_id)
        if ws:
            try:
                await ws.send_text(f"CMD:{uuid4()}:{arduino_cmd}")
            except Exception:
                unregister_ws(device_id=device_id)
                enqueue_mebo(device_id=device_id, ui_cmd=cmd, arduino_cmd=arduino_cmd)
        else:
            enqueue_mebo(device_id=device_id, ui_cmd=cmd, arduino_cmd=arduino_cmd)

        return CommandResponse(is_ok=True, cmd=cmd)

    # Otherwise, treat as WOWE command
    if cmd_lower not in _ALLOWED_WOWE_CMDS:
        raise HTTPException(status_code=400, detail=f"Unknown command: {cmd}")

    # Store for debugging
    set_last_cmd(cmd=cmd)

    # Enqueue an IR code for the ESP32-IR device to execute.
    ir_code = try_get_ir_code(ui_cmd=cmd_lower)
    if ir_code is not None:
        enqueue_ir(device_id=device_id, ui_cmd=cmd, ir_code=ir_code)

    return CommandResponse(is_ok=True, cmd=cmd)

