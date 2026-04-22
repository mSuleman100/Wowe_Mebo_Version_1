"""
==============================================================================
 WOWE Backend - Script Routes (backend/routers/script_routes.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - Receive validated JSON script from frontend and execute it.
 - Handles Series/Parallel execution logic on backend.
==============================================================================
"""

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from backend.state.ir_queue import enqueue
from backend.types.schemas import ScriptRequest, ScriptResponse
from backend.utils.cmd_mapping import try_get_ir_code

router = APIRouter(prefix="/api/scripts", tags=["scripts"])
logger = logging.getLogger("uvicorn.error")

# Command-specific execution durations (in seconds)
# These represent the average time each command takes to complete physically
# after the IR signal is transmitted and ACK'd
COMMAND_DURATIONS: dict[str, float] = {
    "up": 8.35,
    "down": 8.18,
    "pick_up": 3.42,
    "throw": 3.26,
    "right": 11.46,
    "left": 11.46,
    "strike": 4.16,
    "burp": 1.89,
    "boar": 6.71,
    "roar": 2.76,
    # Default fallback for unmapped commands (e.g., "stop", "halt")
    # These typically complete quickly, so use a small delay
    "stop": 0.5,
    "halt": 0.5,
}


def get_command_duration(command: str) -> float:
    """
    Get the execution duration for a command.

    Args:
        command: Normalized command string (lowercase)

    Returns:
        Duration in seconds (default: 0.5 if command not mapped)
    """
    return COMMAND_DURATIONS.get(command, 0.5)


def _validate_node(node: dict[str, Any], path: str = "root") -> None:
    """
    Recursively validate a script node (robot dict or nested Series/Parallel).

    Args:
        node: A dict that can be:
            - Robot dict: { "robot_id": ["cmd1", "cmd2"] }
            - Nested Series: { "Series": [...] }
            - Nested Parallel: { "Parallel": [...] }
        path: Current path in the script tree for error messages
    """
    if not isinstance(node, dict):
        raise HTTPException(
            status_code=400,
            detail=f'Node at "{path}" must be a JSON object.'
        )

    keys = list(node.keys())
    if len(keys) != 1:
        raise HTTPException(
            status_code=400,
            detail=f'Node at "{path}" must have exactly one key (robot ID, "Series", or "Parallel").'
        )

    key = keys[0]

    # Case 1: Robot dict - { "robot_id": ["cmd1", "cmd2"] }
    if key not in ("Series", "Parallel"):
        robot_id = key
        if not robot_id or not isinstance(robot_id, str) or not robot_id.strip():
            raise HTTPException(
                status_code=400,
                detail=f'Robot ID at "{path}" cannot be empty.'
            )

        commands = node[robot_id]
        if not isinstance(commands, list):
            raise HTTPException(
                status_code=400,
                detail=f'Robot "{robot_id}" at "{path}" value must be an array of commands.'
            )

        if len(commands) == 0:
            raise HTTPException(
                status_code=400,
                detail=f'Robot "{robot_id}" at "{path}" must have at least one command.'
            )

        for cmd_idx, cmd in enumerate(commands):
            if not isinstance(cmd, str) or not cmd.strip():
                raise HTTPException(
                    status_code=400,
                    detail=f'Robot "{robot_id}" at "{path}" command {cmd_idx + 1} must be a non-empty string.'
                )
        return

    # Case 2: Nested Series or Parallel
    mode_key = key
    children = node[mode_key]
    if not isinstance(children, list):
        raise HTTPException(
            status_code=400,
            detail=f'"{mode_key}" at "{path}" value must be an array/list.'
        )

    if len(children) == 0:
        raise HTTPException(
            status_code=400,
            detail=f'"{mode_key}" at "{path}" array cannot be empty.'
        )

    # Recursively validate each child
    for idx, child in enumerate(children):
        child_path = f"{path}.{mode_key}[{idx}]"
        _validate_node(child, child_path)


def validate_script(script: dict[str, Any]) -> None:
    """
    Validate script format and structure (supports nested Series/Parallel).

    Raises HTTPException if validation fails.

    Examples:
    {
      "Series": [
        { "alpha": ["Left", "Right"] },
        { "Parallel": [
            { "bravo": ["Forward"] },
            { "charlie": ["Stop"] }
          ]
        }
      ]
    }
    """
    if not isinstance(script, dict):
        raise HTTPException(status_code=400, detail="Script must be a JSON object.")

    keys = list(script.keys())
    if len(keys) != 1:
        raise HTTPException(
            status_code=400,
            detail='Script must have exactly one key: "Series" or "Parallel".'
        )

    mode_key = keys[0]
    if mode_key not in ("Series", "Parallel"):
        raise HTTPException(
            status_code=400,
            detail=f'Top-level key must be "Series" or "Parallel", got "{mode_key}".'
        )

    # Recursively validate the entire tree
    _validate_node(script, "root")


async def execute_single_command(robot_id: str, command: str) -> None:
    """
    Execute a single command for a robot and wait for ACK before proceeding.

    Args:
        robot_id: Robot identifier (e.g., "alpha", "bravo")
        command: Single command string (e.g., "Left", "Right", "Stop", "Up", "Down")
    """
    from backend.state.ir_queue import wait_for_ack

    robot_upper = robot_id.upper()
    cmd_normalized = command.strip().lower()  # Normalize to lowercase for mapping

    # Map command to IR code
    ir_code = try_get_ir_code(ui_cmd=cmd_normalized)

    if ir_code is None:
        logger.warning(f"[ROBOT {robot_upper}] Unknown command: '{command}' (skipping)")
        return

    # Enqueue command for robot (ESP32 will poll /ir/next/{robot_id} to get it)
    msg = enqueue(device_id=robot_id, ui_cmd=cmd_normalized, ir_code=ir_code)
    logger.info(f"[ROBOT {robot_upper}] Queued command: '{cmd_normalized}' → IR 0x{ir_code:02X} (msg_id={msg.message_id})")

    # Wait for ESP32 to ACK this command (timeout: 5 seconds)
    ack_received = await wait_for_ack(message_id=msg.message_id, timeout_seconds=5.0)

    if ack_received:
        logger.info(f"[ROBOT {robot_upper}] Command '{cmd_normalized}' ACK received")
    else:
        logger.warning(f"[ROBOT {robot_upper}] Command '{cmd_normalized}' ACK timeout (continuing anyway)")

    # Wait for command-specific duration to allow robot to complete physical movement
    duration = get_command_duration(cmd_normalized)
    if duration > 0:
        logger.info(f"[ROBOT {robot_upper}] Waiting {duration:.2f}s for '{cmd_normalized}' to complete")
        await asyncio.sleep(duration)
        logger.info(f"[ROBOT {robot_upper}] Command '{cmd_normalized}' execution completed")


async def execute_robot_commands(robot_id: str, commands: list[str]) -> None:
    """
    Execute commands for a single robot, waiting for each ACK before proceeding.

    Args:
        robot_id: Robot identifier (e.g., "alpha", "bravo")
        commands: List of command strings (e.g., ["Left", "Left", "Right", "Stop"])
    """
    from backend.state.ir_queue import wait_for_ack

    robot_upper = robot_id.upper()
    logger.info(f"[ROBOT {robot_upper}] Starting execution with {len(commands)} commands")

    for idx, cmd in enumerate(commands, start=1):
        cmd_normalized = cmd.strip().lower()  # Normalize to lowercase for mapping

        # Map command to IR code
        ir_code = try_get_ir_code(ui_cmd=cmd_normalized)

        if ir_code is None:
            logger.warning(f"[ROBOT {robot_upper}] Command {idx}/{len(commands)}: Unknown command '{cmd}' (skipping)")
            continue

        # Enqueue command for robot (ESP32 will poll /ir/next/{robot_id} to get it)
        msg = enqueue(device_id=robot_id, ui_cmd=cmd_normalized, ir_code=ir_code)
        logger.info(f"[ROBOT {robot_upper}] Command {idx}/{len(commands)}: Queued '{cmd_normalized}' → IR 0x{ir_code:02X} (msg_id={msg.message_id})")

        # Wait for ESP32 to ACK this command (timeout: 5 seconds)
        ack_received = await wait_for_ack(message_id=msg.message_id, timeout_seconds=5.0)

        if ack_received:
            logger.info(f"[ROBOT {robot_upper}] Command {idx}/{len(commands)}: '{cmd_normalized}' ACK received")
        else:
            logger.warning(f"[ROBOT {robot_upper}] Command {idx}/{len(commands)}: '{cmd_normalized}' ACK timeout (continuing anyway)")

        # Wait for command-specific duration to allow robot to complete physical movement
        duration = get_command_duration(cmd_normalized)
        if duration > 0:
            logger.info(f"[ROBOT {robot_upper}] Command {idx}/{len(commands)}: Waiting {duration:.2f}s for '{cmd_normalized}' to complete")
            await asyncio.sleep(duration)
            logger.info(f"[ROBOT {robot_upper}] Command {idx}/{len(commands)}: '{cmd_normalized}' execution completed")

    logger.info(f"[ROBOT {robot_upper}] Finished all commands")


async def execute_series(script: dict[str, Any]) -> None:
    """
    Execute script in Series (Synchronous) mode (supports nested structures).
    Robots execute one after another, sequentially.

    Args:
        script: Script dict with "Series" key containing list of robot dicts or nested Series/Parallel nodes
    """
    series_items = script.get("Series", [])
    logger.info(f"[SERIES MODE] Starting execution with {len(series_items)} items")

    for idx, item in enumerate(series_items):
        item_num = idx + 1
        keys = list(item.keys())
        key = keys[0]

        # Case 1: Robot dict - execute commands
        if key not in ("Series", "Parallel"):
            robot_id = key
            commands = item[robot_id]
            logger.info(f"[SERIES MODE] Item {item_num}/{len(series_items)}: Executing robot {robot_id}")
            await execute_robot_commands(robot_id, commands)
            logger.info(f"[SERIES MODE] Item {item_num}: Robot {robot_id} completed")

        # Case 2: Nested Series - execute recursively
        elif key == "Series":
            logger.info(f"[SERIES MODE] Item {item_num}/{len(series_items)}: Executing nested Series")
            await execute_series(item)
            logger.info(f"[SERIES MODE] Item {item_num}: Nested Series completed")

        # Case 3: Nested Parallel - execute recursively
        elif key == "Parallel":
            logger.info(f"[SERIES MODE] Item {item_num}/{len(series_items)}: Executing nested Parallel")
            await execute_parallel(item)
            logger.info(f"[SERIES MODE] Item {item_num}: Nested Parallel completed")

    logger.info("[SERIES MODE] All items completed")


def _flatten_series_to_steps(series_item: dict[str, Any]) -> list[tuple[str, str]]:
    """
    Flatten a nested Series node into a list of (robot_id, command) tuples.
    Each tuple represents one step in the Series execution.

    Args:
        series_item: A Series node like { "Series": [{ "alpha": ["1", "2"] }, { "bravo": ["3"] }] }

    Returns:
        List of (robot_id, command) tuples: [("alpha", "1"), ("alpha", "2"), ("bravo", "3")]
    """
    steps: list[tuple[str, str]] = []
    series_items = series_item.get("Series", [])

    for item in series_items:
        keys = list(item.keys())
        key = keys[0]

        if key not in ("Series", "Parallel"):
            # Robot dict - add all commands as steps
            robot_id = key
            commands = item[robot_id]
            for cmd in commands:
                steps.append((robot_id, cmd))
        else:
            # Nested Series or Parallel - flatten recursively
            if key == "Series":
                nested_steps = _flatten_series_to_steps(item)
                steps.extend(nested_steps)
            elif key == "Parallel":
                # For nested Parallel, we need to flatten it differently
                # Extract all commands from all robots in the Parallel
                parallel_items = item.get("Parallel", [])
                for parallel_item in parallel_items:
                    parallel_keys = list(parallel_item.keys())
                    parallel_key = parallel_keys[0]
                    if parallel_key not in ("Series", "Parallel"):
                        robot_id = parallel_key
                        commands = parallel_item[robot_id]
                        for cmd in commands:
                            steps.append((robot_id, cmd))
                    else:
                        # Further nested - flatten recursively
                        if parallel_key == "Series":
                            nested_steps = _flatten_series_to_steps(parallel_item)
                            steps.extend(nested_steps)
                        # Note: Nested Parallel within Series is flattened sequentially

    return steps


async def execute_parallel(script: dict[str, Any]) -> None:
    """
    Execute script in Parallel (Synchronized) mode (supports nested structures).
    All robots execute commands step-by-step in sync:
    - Step 1: All robots execute their 1st command simultaneously
    - Step 2: All robots execute their 2nd command simultaneously
    - And so on...
    Nested Series nodes are flattened into steps and synchronized with other Parallel tasks.

    Args:
        script: Script dict with "Parallel" key containing list of robot dicts or nested Series/Parallel nodes
    """
    parallel_items = script.get("Parallel", [])
    logger.info(f"[PARALLEL MODE] Starting synchronized execution with {len(parallel_items)} items")

    # Build a unified step map: each item contributes steps
    # Format: { item_index: list of steps }
    # Steps can be: (robot_id, command) tuples or dict for nested Parallel
    all_steps: dict[int, list[Any]] = {}
    nested_parallel_items: dict[int, dict[str, Any]] = {}  # Track nested Parallel items

    for idx, item in enumerate(parallel_items):
        keys = list(item.keys())
        key = keys[0]

        if key not in ("Series", "Parallel"):
            # Robot dict - each command is a step
            robot_id = key
            commands = item[robot_id]
            steps = [(robot_id, cmd) for cmd in commands]
            all_steps[idx] = steps
            logger.info(f"[PARALLEL MODE] Item {idx + 1}: Robot {robot_id.upper()} has {len(steps)} steps")
        elif key == "Series":
            # Nested Series - flatten into steps
            steps = _flatten_series_to_steps(item)
            all_steps[idx] = steps
            logger.info(f"[PARALLEL MODE] Item {idx + 1}: Nested Series flattened to {len(steps)} steps")
        elif key == "Parallel":
            # Nested Parallel - store separately and execute as unit at step 1
            nested_parallel_items[idx] = item
            all_steps[idx] = [None]  # Placeholder for step 1
            logger.info(f"[PARALLEL MODE] Item {idx + 1}: Found nested Parallel (executes as unit)")

    # Find the maximum number of steps across all items
    max_steps = max(len(steps) for steps in all_steps.values()) if all_steps else 0
    logger.info(f"[PARALLEL MODE] Maximum steps: {max_steps}")

    # Execute step-by-step, synchronizing at each step
    for step in range(max_steps):
        step_num = step + 1
        logger.info(f"[PARALLEL MODE] === STEP {step_num}/{max_steps} ===")

        tasks = []

        # Execute one step from each item that has work at this step
        for item_idx, steps_list in all_steps.items():
            if step < len(steps_list):
                step_data = steps_list[step]

                # Check if this item has a nested Parallel to execute at step 1
                if item_idx in nested_parallel_items and step == 0:
                    nested_parallel_item = nested_parallel_items[item_idx]
                    logger.info(f"[PARALLEL MODE] Item {item_idx + 1}: Executing nested Parallel at step {step_num}")
                    task = execute_parallel(nested_parallel_item)
                    tasks.append(task)
                elif step_data is not None:
                    # Regular step: (robot_id, command)
                    robot_id, command = step_data
                    logger.info(f"[PARALLEL MODE] Item {item_idx + 1}: Queuing {robot_id.upper()}: command {step_num} = {command}")
                    task = execute_single_command(robot_id, command)
                    tasks.append(task)

        # Execute all tasks for this step concurrently
        if tasks:
            await asyncio.gather(*tasks)
            logger.info(f"[PARALLEL MODE] Step {step_num} completed for all items")
        else:
            logger.info(f"[PARALLEL MODE] Step {step_num}: No items have work at this step")

    logger.info("[PARALLEL MODE] All items completed synchronized execution")


@router.post("/execute", response_model=ScriptResponse)
async def post_execute_script(payload: ScriptRequest) -> ScriptResponse:
    """
    Receive a validated JSON script from frontend and execute it.

    Expected format:
    {
      "Series": [
        { "alpha": ["Left", "Left", "Right", "Stop"] },
        { "bravo": ["Left", "Left", "Right", "Stop"] }
      ]
    }
    or:
    {
      "Parallel": [
        { "alpha": ["Left", "Right"] },
        { "bravo": ["Forward", "Stop"] }
      ]
    }
    """
    script = payload.script

    # Log received script
    logger.info("SCRIPT EXECUTE received: %s", script)

    # Validate script format and structure
    try:
        validate_script(script)
        logger.info("SCRIPT EXECUTE: Validation passed")
    except HTTPException:
        # Re-raise HTTPException as-is (already has proper status code and detail)
        raise
    except Exception as e:
        logger.error("SCRIPT EXECUTE: Unexpected validation error: %s", str(e))
        raise HTTPException(status_code=400, detail=f"Script validation failed: {str(e)}")

    # Determine execution mode and call appropriate function
    if "Series" in script:
        logger.info("SCRIPT EXECUTE: Mode = SERIES (Synchronous)")
        await execute_series(script)
        return ScriptResponse(is_ok=True, message="Script executed successfully in Series mode")

    elif "Parallel" in script:
        logger.info("SCRIPT EXECUTE: Mode = PARALLEL (Asynchronous)")
        await execute_parallel(script)
        return ScriptResponse(is_ok=True, message="Script executed successfully in Parallel mode")

    else:
        logger.error("SCRIPT EXECUTE: Invalid script format - must have 'Series' or 'Parallel' key")
        return ScriptResponse(is_ok=False, message="Invalid script format: must contain 'Series' or 'Parallel' key")
