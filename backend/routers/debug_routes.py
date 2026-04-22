"""
==============================================================================
 WOWE Backend - Debug Routes (backend/routers/debug_routes.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - Quick inspection endpoints for development/testing:
     - GET /debug/state   -> last command + last sequence
     - GET /debug/frames  -> whether each feed has a pushed frame

 Notes:
 - Keep these disabled or protected for production deployments.
==============================================================================
"""

from datetime import datetime

import logging

from fastapi import APIRouter

from backend.types.schemas import TraceRequest

from backend.state.frame_store import get_frame
from backend.state.ir_queue import get_depth
from backend.state.runtime_state import STATE

router = APIRouter(prefix="/debug", tags=["debug"])
logger = logging.getLogger("uvicorn.error")


def _dt_iso(dt: datetime | None) -> str | None:
    """Serialize datetime to ISO-8601 for JSON responses."""
    return dt.isoformat() if dt else None


@router.get("/state")
def get_state() -> dict:
    """Return last command/sequence info (debug only)."""
    return {
        "last_cmd": STATE.last_cmd,
        "last_cmd_at": _dt_iso(STATE.last_cmd_at),
        "last_sequence": STATE.last_sequence,
        "last_sequence_at": _dt_iso(STATE.last_sequence_at),
    }


@router.get("/frames")
def get_frames() -> dict:
    """Return whether each known feed has a stored frame (debug only)."""
    out: dict[str, dict] = {}
    for feed_id in ["alpha", "bravo", "charlie", "delta"]:
        stored = get_frame(feed_id=feed_id)
        out[feed_id] = (
            {"has_frame": True, "bytes": len(stored.jpeg_bytes), "received_at": _dt_iso(stored.received_at)}
            if stored
            else {"has_frame": False}
        )
    return out


@router.get("/queues")
def get_queues() -> dict:
    """Return current IR queue depths per device (debug only)."""
    return {device_id: get_depth(device_id=device_id) for device_id in ["alpha", "bravo", "charlie", "delta"]}


@router.post("/trace")
def post_trace(body: TraceRequest) -> dict:
    """Receive a frontend execution trace and print it to the uvicorn terminal."""
    logger.info("TRACE start run_id=%s title=%s events=%s", body.run_id, body.title, len(body.events))
    for ev in body.events:
        logger.info(
            "TRACE run_id=%s t_ms=%s robot=%s kind=%s detail=%s",
            body.run_id,
            ev.t_ms,
            ev.robot,
            ev.kind,
            ev.detail or "",
        )
    logger.info("TRACE end run_id=%s", body.run_id)
    return {"is_ok": True, "events": len(body.events)}

