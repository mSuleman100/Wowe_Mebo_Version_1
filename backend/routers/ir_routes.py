"""
==============================================================================
 WOWE Backend - IR Dispatch Routes (backend/routers/ir_routes.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - Provide a simple, ESP32-friendly command delivery mechanism for IR actions.

 Endpoints:
 - GET /ir/next/{device_id}
     - Returns 204 if no command
     - Returns 200 with body like "$8E\n" when a command is available

 Notes:
 - The response format intentionally matches your ESP32 serial format ($XX),
   so your IR firmware can reuse the same hex parsing logic.
==============================================================================
"""

import logging

from fastapi import APIRouter, Response

from backend.state.ir_queue import get_depth, pop_next

router = APIRouter(prefix="/ir", tags=["ir"])
logger = logging.getLogger("uvicorn.error")


@router.get("/next/{device_id}")
def get_next_ir_command(device_id: str) -> Response:
    """
    Return the next IR command for a device in "$XX\\n" format.

    - 204: no pending command
    - 200: plain-text body containing "$XX"
    - Headers include: x-wowe-msg-id (for ACK), x-wowe-device, x-wowe-queue-depth
    """
    msg = pop_next(device_id=device_id)
    if not msg:
        return Response(status_code=204)

    # $XX format (uppercase hex) + newline for convenience
    body = f"${msg.ir_code:02X}\n"
    headers = {
        "x-wowe-msg-id": msg.message_id,  # Required by ESP32 for ACK
        "x-wowe-device": msg.device_id,
        "x-wowe-queue-depth": str(get_depth(device_id=device_id))
    }
    return Response(content=body, media_type="text/plain", headers=headers)


@router.post("/ack/{device_id}/{message_id}")
def post_ir_ack(device_id: str, message_id: str) -> Response:
    """
    Acknowledge receipt of an IR command message.

    ESP32 calls this after executing a command to confirm delivery.
    Signals the waiting execution thread that command is complete.

    - 204: ACK received successfully
    """
    from backend.state.ir_queue import mark_ack_received

    ack_received = mark_ack_received(message_id=message_id)
    if ack_received:
        logger.info(f"IR ACK received: device={device_id} msg_id={message_id}")
    else:
        logger.warning(f"IR ACK for unknown msg_id: device={device_id} msg_id={message_id}")

    return Response(status_code=204)

