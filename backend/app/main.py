"""
==============================================================================
 WOWE Backend - FastAPI App (backend/app/main.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - Create the FastAPI application
 - Configure CORS for the frontend UI (localhost:5173)
 - Register routers:
     - health, video (GET frame + ESP32 upload), commands, sequences, debug
==============================================================================
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.cmd_routes import router as cmd_router
from backend.routers.claude_settings_routes import router as claude_settings_router
from backend.routers.debug_routes import router as debug_router
from backend.routers.health_routes import router as health_router
from backend.routers.ir_routes import router as ir_router
from backend.routers.mebo_routes import router as mebo_router
from backend.routers.robot_routes import router as robot_router
from backend.routers.script_routes import router as script_router
from backend.routers.sequence_routes import router as sequence_router
from backend.routers.video_routes import router as video_router
from backend.state.frame_store import put_frame
from backend.state.mebo_queue import mark_ack_received, register_ws, unregister_ws


def create_app() -> FastAPI:
    """Create and configure the FastAPI application (RORO: no globals passed in)."""
    app = FastAPI(title="WOWE Backend", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8080", "http://127.0.0.1:8080", "http://192.168.0.101:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(video_router)
    app.include_router(cmd_router)
    app.include_router(claude_settings_router)
    app.include_router(sequence_router)
    app.include_router(ir_router)
    app.include_router(mebo_router)
    app.include_router(robot_router)
    app.include_router(script_router)
    app.include_router(debug_router)

    # WebSocket route registered directly on app — Starlette 1.0 does not route
    # WebSocket scopes through APIRouter.include_router correctly.
    @app.websocket("/video/{feed_id}/ws")
    async def ws_video_upload(websocket: WebSocket, feed_id: str) -> None:
        """Persistent WebSocket endpoint for ESP32-CAM frame push."""
        await websocket.accept()
        try:
            while True:
                jpeg_bytes = await websocket.receive_bytes()
                if len(jpeg_bytes) >= 2 and jpeg_bytes[0] == 0xFF and jpeg_bytes[1] == 0xD8:
                    put_frame(feed_id=feed_id, jpeg_bytes=jpeg_bytes)
        except (WebSocketDisconnect, Exception):
            pass

    @app.websocket("/mebo/ws/{device_id}")
    async def mebo_ws_endpoint(websocket: WebSocket, device_id: str) -> None:
        """Persistent WebSocket for ESP32 MEBO command push."""
        import logging
        logger = logging.getLogger("uvicorn.error")
        await websocket.accept()
        register_ws(device_id=device_id, ws=websocket)
        logger.info(f"MEBO WS connected: device={device_id}")
        try:
            while True:
                data = await websocket.receive_text()
                if data.startswith("ACK:"):
                    mark_ack_received(message_id=data[4:].strip())
        except WebSocketDisconnect:
            logger.info(f"MEBO WS disconnected: device={device_id}")
            unregister_ws(device_id=device_id)
        except Exception as e:
            logger.error(f"MEBO WS error: device={device_id} error={e}")
            unregister_ws(device_id=device_id)

    return app


app = create_app()

