"""
==============================================================================
 AI State Manager (backend/state/ai_state.py)

 Purpose:
 - Manage AI instances for multiple robots
 - Thread-safe access to AI state
 - Persist AI configuration
==============================================================================
"""

import asyncio
from threading import Lock
from typing import Optional, Dict

from backend.ai.engine import AIInstance

# Global AI instances storage
_lock = Lock()
_ai_instances: Dict[str, AIInstance] = {}


async def start_ai_mode(
    robot_type: str,
    robot_id: str,
    system_prompt: str,
    loop_interval_seconds: float,
    server_origin: str,
    claude_api_key: str
) -> dict:
    """Start AI mode for a robot"""
    with _lock:
        # Stop existing instance if running
        if robot_id in _ai_instances and _ai_instances[robot_id].is_running:
            asyncio.create_task(_ai_instances[robot_id].stop())

        # Create new instance
        instance = AIInstance(
            robot_type=robot_type,
            robot_id=robot_id,
            system_prompt=system_prompt,
            loop_interval_seconds=loop_interval_seconds,
            server_origin=server_origin,
            claude_api_key=claude_api_key
        )

        _ai_instances[robot_id] = instance

    # Start async loop
    await instance.start()

    return instance.to_dict()


async def stop_ai_mode(robot_id: str) -> dict:
    """Stop AI mode for a robot"""
    with _lock:
        instance = _ai_instances.get(robot_id)

    if instance:
        await instance.stop()
        return instance.to_dict()

    return {"error": f"No AI instance for robot {robot_id}"}


def is_ai_running(robot_id: str) -> bool:
    """Check if AI is running for a robot"""
    with _lock:
        instance = _ai_instances.get(robot_id)
    return instance.is_running if instance else False


def get_ai_status(robot_id: str) -> dict:
    """Get AI status for a robot"""
    with _lock:
        instance = _ai_instances.get(robot_id)

    if not instance:
        return {"error": f"No AI instance for robot {robot_id}"}

    return instance.to_dict()


def get_ai_logs(robot_id: str) -> list:
    """Get AI logs for a robot"""
    with _lock:
        instance = _ai_instances.get(robot_id)

    if not instance:
        return []

    return instance.get_logs()


def clear_ai_logs(robot_id: str):
    """Clear AI logs for a robot"""
    with _lock:
        instance = _ai_instances.get(robot_id)

    if instance:
        instance.logs = []


def get_all_ai_instances() -> dict:
    """Get all active AI instances"""
    with _lock:
        return {
            robot_id: instance.to_dict()
            for robot_id, instance in _ai_instances.items()
            if instance.is_running
        }


async def stop_all_ai_modes():
    """Stop all AI modes (cleanup)"""
    with _lock:
        instances = list(_ai_instances.values())

    for instance in instances:
        if instance.is_running:
            await instance.stop()
