"""
==============================================================================
 AI Mode Routes (backend/routers/ai_routes.py)

 Purpose:
 - Provide REST API for AI mode control
 - Start/stop AI for specific robots
 - Get AI status and logs
 - Frontend calls these endpoints instead of running AI locally

 Endpoints:
 - POST /ai/start         - Start AI mode
 - POST /ai/stop          - Stop AI mode
 - GET  /ai/status/{id}   - Get AI status
 - GET  /ai/logs/{id}     - Get AI decision logs
 - POST /ai/clear-logs/{id} - Clear logs
 - GET  /ai/instances     - Get all active instances
==============================================================================
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.state.ai_state import (
    start_ai_mode,
    stop_ai_mode,
    is_ai_running,
    get_ai_status,
    get_ai_logs,
    clear_ai_logs,
    get_all_ai_instances,
)
from backend.state.claude_settings import get_claude_settings

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger("uvicorn.error")


class StartAIRequest(BaseModel):
    """Request to start AI mode"""
    robot_type: str  # 'wowe' or 'mebo'
    robot_id: str
    system_prompt: str
    loop_interval_seconds: float = 0.5
    server_origin: str = "http://localhost:8002"


class StopAIRequest(BaseModel):
    """Request to stop AI mode"""
    robot_id: str


@router.post("/start")
async def start_ai(request: StartAIRequest) -> dict:
    """Start AI mode for a robot"""
    try:
        # Get Claude API key from settings
        claude_settings = get_claude_settings()
        api_key = claude_settings.get("api_key", "")

        if not api_key:
            raise HTTPException(status_code=400, detail="Claude API key not configured")

        result = await start_ai_mode(
            robot_type=request.robot_type,
            robot_id=request.robot_id,
            system_prompt=request.system_prompt,
            loop_interval_seconds=request.loop_interval_seconds,
            server_origin=request.server_origin,
            claude_api_key=api_key
        )

        logger.info(f"AI Mode started: robot={request.robot_id}")
        return {"success": True, "data": result}

    except Exception as e:
        logger.error(f"Failed to start AI: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_ai(request: StopAIRequest) -> dict:
    """Stop AI mode for a robot"""
    try:
        result = await stop_ai_mode(request.robot_id)
        logger.info(f"AI Mode stopped: robot={request.robot_id}")
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Failed to stop AI: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{robot_id}")
async def get_status(robot_id: str) -> dict:
    """Get AI status for a robot"""
    status = get_ai_status(robot_id)
    if "error" in status:
        raise HTTPException(status_code=404, detail=status["error"])
    return {"success": True, "data": status}


@router.get("/logs/{robot_id}")
async def get_logs(robot_id: str) -> dict:
    """Get AI decision logs for a robot"""
    logs = get_ai_logs(robot_id)
    return {"success": True, "data": logs}


@router.post("/clear-logs/{robot_id}")
async def clear_logs(robot_id: str) -> dict:
    """Clear AI logs for a robot"""
    clear_ai_logs(robot_id)
    return {"success": True, "message": f"Logs cleared for {robot_id}"}


@router.get("/instances")
async def get_instances() -> dict:
    """Get all active AI instances"""
    instances = get_all_ai_instances()
    return {"success": True, "data": instances}


@router.get("/running/{robot_id}")
async def check_running(robot_id: str) -> dict:
    """Check if AI is running for a robot"""
    running = is_ai_running(robot_id)
    return {"success": True, "is_running": running}
