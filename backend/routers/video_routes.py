"""
==============================================================================
 WOWE Backend - Video Routes (backend/routers/video_routes.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - GET  /video/{feed_id}           -> return latest JPEG frame for a feed
 - POST /video/{feed_id}/upload    -> ESP32-CAM pushes raw JPEG bytes here

 Design:
 - The backend stores ONLY the latest frame per feed in memory.
 - If no frame exists yet, it returns a generated placeholder JPEG.
==============================================================================
"""

import asyncio

from fastapi import APIRouter, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from backend.state.frame_store import get_frame, put_frame
from backend.utils.frame_generator import FrameSpec, render_placeholder_jpeg

router = APIRouter()


@router.get("/video/{feed_id}")
def get_video_frame(feed_id: str) -> Response:
    """Return the latest JPEG frame for the requested feed."""
    stored = get_frame(feed_id=feed_id)
    if stored:
        return Response(
            content=stored.jpeg_bytes,
            media_type="image/jpeg",
            headers={"cache-control": "no-store"},
        )

    frame = render_placeholder_jpeg(spec=FrameSpec(feed_id=feed_id))
    return Response(content=frame, media_type="image/jpeg", headers={"cache-control": "no-store"})

@router.get("/mjpeg/{feed_id}")
async def get_mjpeg_stream(feed_id: str) -> StreamingResponse:
    """
    MJPEG stream endpoint (multipart/x-mixed-replace).

    Why this exists:
    - The UI previously "polled" /video/{feed_id} repeatedly (laggy + overhead).
    - MJPEG keeps a single connection open and continuously pushes frames, which
      is smoother and lower overhead per frame.

    Data source:
    - Frames are pushed by ESP32-CAM to POST /video/{feed_id}/upload and stored
      in memory (latest frame per feed).
    """

    boundary = "frame"

    async def frame_generator():
        last_seen_at = None
        placeholder_bytes = None

        while True:
            stored = get_frame(feed_id=feed_id)
            if stored:
                if last_seen_at == stored.received_at:
                    await asyncio.sleep(0.02)
                    continue

                last_seen_at = stored.received_at
                jpeg_bytes = stored.jpeg_bytes
            else:
                # If no real frame exists yet, emit a placeholder occasionally.
                if placeholder_bytes is None:
                    placeholder_bytes = render_placeholder_jpeg(spec=FrameSpec(feed_id=feed_id))
                jpeg_bytes = placeholder_bytes
                await asyncio.sleep(0.12)

            header = (
                f"--{boundary}\r\n"
                "Content-Type: image/jpeg\r\n"
                f"Content-Length: {len(jpeg_bytes)}\r\n\r\n"
            ).encode("utf-8")

            yield header + jpeg_bytes + b"\r\n"

    return StreamingResponse(
        frame_generator(),
        media_type=f"multipart/x-mixed-replace; boundary={boundary}",
        headers={"cache-control": "no-store"},
    )


@router.websocket("/video/{feed_id}/ws")
async def websocket_video_upload(websocket: WebSocket, feed_id: str) -> None:
    """
    Receive JPEG frames from ESP32-CAM via a persistent WebSocket connection.

    Why WebSocket instead of HTTP POST-per-frame:
    - No TCP handshake overhead per frame (was ~100-300 ms each time)
    - Frames flow over one open connection — latency drops to ~1-2 ms overhead
    - Auto-reconnect is handled on the ESP32 side (setReconnectInterval)

    Frames land in the same frame_store used by GET /video/{feed_id} and
    GET /mjpeg/{feed_id} — the dashboard requires no changes.
    """
    await websocket.accept()
    try:
        while True:
            jpeg_bytes = await websocket.receive_bytes()
            # Basic JPEG magic-byte check before storing
            if len(jpeg_bytes) >= 2 and jpeg_bytes[0] == 0xFF and jpeg_bytes[1] == 0xD8:
                put_frame(feed_id=feed_id, jpeg_bytes=jpeg_bytes)
    except WebSocketDisconnect:
        pass  # ESP32 disconnected — it will reconnect automatically


@router.post("/video/{feed_id}/upload")
async def upload_video_frame(feed_id: str, request: Request) -> dict:
    """
    Receive a JPEG frame from ESP32-CAM.

    Expected:
    - Content-Type: image/jpeg (not strictly required, but recommended)
    - Body: raw JPEG bytes
    """
    content_type = (request.headers.get("content-type") or "").lower()

    jpeg_bytes = await request.body()
    if not jpeg_bytes:
        raise HTTPException(status_code=400, detail="Empty body")

    # Basic magic header check (optional but helpful)
    if not (len(jpeg_bytes) >= 2 and jpeg_bytes[0] == 0xFF and jpeg_bytes[1] == 0xD8):
        raise HTTPException(
            status_code=400,
            detail=f"Body does not look like a JPEG (content-type={content_type or 'missing'})",
        )

    put_frame(feed_id=feed_id, jpeg_bytes=jpeg_bytes)
    return {"is_ok": True, "feed_id": feed_id}

