"""
==============================================================================
MEBO Backend - MEBO Dispatch Routes (backend/routers/mebo_routes.py)

Author:   M. Suleman Anwar
Date:     2026-01-15

Purpose:
- Provide a simple, ESP32-friendly command delivery mechanism for MEBO actions.

Endpoints:
- GET /mebo/next/{device_id}
    - Returns 204 if no command
    - Returns 200 with body containing the character command (e.g., "s\n")
- POST /mebo/ack/{device_id}/{message_id}
    - Acknowledge receipt of a MEBO command message

Notes:
- The response format is a single character + newline for ESP32 to send to Arduino.
- ESP32 reads this and sends it via Serial to Arduino Nano.
- ESP32 should send ACK after successfully sending command to Arduino.
==============================================================================
"""

import logging

from fastapi import APIRouter, Response

from backend.state.mebo_queue import get_depth, pop_next

router = APIRouter(prefix="/mebo", tags=["mebo"])
logger = logging.getLogger("uvicorn.error")


@router.get("/next/{device_id}")
def get_next_mebo_command(device_id: str) -> Response:
    """
    Return the next MEBO command for a device as a character + newline.

    - 204: no pending command
    - 200: plain-text body containing the character command (e.g., "s\n")
    - Headers include: x-mebo-msg-id (for ACK), x-mebo-device, x-mebo-queue-depth
    """
    msg = pop_next(device_id=device_id)
    if not msg:
        return Response(status_code=204)

    # Character command + newline for ESP32 convenience
    body = f"{msg.arduino_cmd}\n"
    headers = {
        "x-mebo-msg-id": msg.message_id,  # Required by ESP32 for ACK
        "x-mebo-device": msg.device_id,
        "x-mebo-queue-depth": str(get_depth(device_id=device_id))
    }
    return Response(content=body, media_type="text/plain", headers=headers)


@router.post("/ack/{device_id}/{message_id}")
def post_mebo_ack(device_id: str, message_id: str) -> Response:
    """
    Acknowledge receipt of a MEBO command message.

    ESP32 calls this after executing a command to confirm delivery.
    Signals the waiting execution thread that command is complete.

    - 204: ACK received successfully
    """
    from backend.state.mebo_queue import mark_ack_received

    ack_received = mark_ack_received(message_id=message_id)
    if ack_received:
        logger.info(f"MEBO ACK received: device={device_id} msg_id={message_id}")
    else:
        logger.warning(f"MEBO ACK for unknown msg_id: device={device_id} msg_id={message_id}")

    return Response(status_code=204)

