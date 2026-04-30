"""
==============================================================================
 WOWE AI Engine - Python Backend (backend/ai/engine.py)

 Author:   M. Suleman Anwar
 Date:     2026-04-30

 Purpose:
 - AI decision loop running on backend (not frontend)
 - Tracks robot position locally (MEBO has no onboard sensor)
 - Integrates with Claude API for autonomous control
 - Handles multiple robots independently
 - Provides real-time decision logging

 Architecture:
 - Each robot gets its own AIInstance
 - AIInstance tracks: position, heading, movement history
 - Decision loop: get status → ask Claude → parse → execute → log
 - Runs in background thread per robot
==============================================================================
"""

import asyncio
import json
import logging
import math
import time
from datetime import datetime
from typing import Optional

import httpx
from anthropic import Anthropic

logger = logging.getLogger("uvicorn.error")

# Constants for MEBO movement
FORWARD_DISTANCE = 0.40  # 40cm in meters
ROTATION_DEGREES = 90    # 90 degrees per rotation command

# Compass directions
COMPASS = {0: "North", 90: "East", 180: "South", 270: "West"}


class AILog:
    """Single AI decision log entry"""
    def __init__(self, robot_id: str, status: str, decision_text: str = "",
                 command: str = "", error: str = "", position: dict = None, heading: int = 0):
        self.id = int(time.time() * 1000)
        self.timestamp = datetime.utcnow().isoformat()
        self.robot_id = robot_id
        self.status = status  # 'decision_made', 'command_executed', 'error', 'started', 'stopped'
        self.decision_text = decision_text
        self.command = command
        self.error = error
        self.position = position or {"x": 0, "y": 0}
        self.heading = heading

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "robot_id": self.robot_id,
            "status": self.status,
            "decision_text": self.decision_text,
            "command": self.command,
            "error": self.error,
            "position": self.position,
            "heading": self.heading,
        }


class AIInstance:
    """Represents an AI-controlled robot instance"""

    def __init__(self, robot_type: str, robot_id: str, system_prompt: str,
                 loop_interval_seconds: float, server_origin: str, claude_api_key: str):
        self.robot_type = robot_type
        self.robot_id = robot_id
        self.system_prompt = system_prompt
        self.loop_interval_seconds = max(0.5, min(60, loop_interval_seconds))
        self.server_origin = server_origin
        self.claude_api_key = claude_api_key

        # Status tracking
        self.is_running = False
        self.error_count = 0
        self.decision_count = 0
        self.last_decision_text = ""
        self.last_command_sent = ""
        self.last_error = ""

        # Position tracking (MEBO has no onboard sensor)
        self.position = {"x": 0.0, "y": 0.0}
        self.heading = 0  # 0=North, 90=East, 180=South, 270=West
        self.movement_history = []

        # Logs
        self.logs = []
        self.max_logs = 50

        # Async loop
        self.loop_task: Optional[asyncio.Task] = None
        self.client = Anthropic(api_key=claude_api_key) if claude_api_key else None

    def add_log(self, log: AILog):
        """Add log entry"""
        self.logs.insert(0, log)  # Newest first
        if len(self.logs) > self.max_logs:
            self.logs = self.logs[:self.max_logs]

    def get_logs(self) -> list[dict]:
        """Get all logs"""
        return [log.to_dict() for log in self.logs]

    def get_compass_direction(self) -> str:
        """Convert heading to compass direction"""
        heading_rounded = round(self.heading / 90) * 90 % 360
        return COMPASS.get(heading_rounded, "Unknown")

    def update_position_from_command(self, command: str):
        """Update position tracking based on command executed"""
        if command == "mebo_forward":
            # Move 40cm in current heading direction
            rad = math.radians(self.heading)
            self.position["x"] += FORWARD_DISTANCE * math.cos(rad)
            self.position["y"] += FORWARD_DISTANCE * math.sin(rad)
            self.movement_history.append({
                "command": command,
                "position": dict(self.position),
                "heading": self.heading
            })
        elif command == "mebo_reverse":
            # Move 40cm backwards
            rad = math.radians(self.heading)
            self.position["x"] -= FORWARD_DISTANCE * math.cos(rad)
            self.position["y"] -= FORWARD_DISTANCE * math.sin(rad)
            self.movement_history.append({
                "command": command,
                "position": dict(self.position),
                "heading": self.heading
            })
        elif command in ("mebo_rotate_right", "mebo_rotate_cw"):
            # Rotate 90 degrees clockwise
            self.heading = (self.heading + ROTATION_DEGREES) % 360
            self.movement_history.append({
                "command": command,
                "heading": self.heading
            })
        elif command in ("mebo_rotate_left", "mebo_rotate_ccw"):
            # Rotate 90 degrees counter-clockwise
            self.heading = (self.heading - ROTATION_DEGREES + 360) % 360
            self.movement_history.append({
                "command": command,
                "heading": self.heading
            })

        # Keep history limited to 10 moves
        if len(self.movement_history) > 10:
            self.movement_history = self.movement_history[-10:]

    async def get_status_report(self, camera_feed: str = "") -> str:
        """Generate status report for Claude"""
        recent_moves = " → ".join([m.get("command", "") for m in self.movement_history[-3:]])
        if not recent_moves:
            recent_moves = "None yet"

        status = f"""
Robot ID: {self.robot_id}
Estimated Position: X={self.position['x']:.2f}m, Y={self.position['y']:.2f}m
Heading: {self.heading}° ({self.get_compass_direction()})
Recent Moves: {recent_moves}
Timestamp: {datetime.utcnow().isoformat()}

INSTRUCTIONS:
- Use mebo_forward (40cm) or mebo_reverse (40cm) to move
- Use mebo_rotate_left or mebo_rotate_right (90° per rotation)
- Always use mebo_stop to halt
- Analyze the camera feed for obstacles and targets
        """.strip()

        return status

    async def fetch_camera_feed(self) -> Optional[str]:
        """Fetch camera feed from robot"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.server_origin}/video/{self.robot_id}?ts={int(time.time() * 1000)}"
                )
                if response.status_code == 200:
                    # Convert to base64
                    import base64
                    return base64.b64encode(response.content).decode('utf-8')
        except Exception as e:
            logger.warning(f"Failed to fetch camera for {self.robot_id}: {e}")
        return None

    def parse_command_from_response(self, response_text: str) -> Optional[str]:
        """Extract command from Claude's response"""
        if self.robot_type.lower() == "mebo":
            commands = [
                "mebo_forward", "mebo_reverse", "mebo_stop",
                "mebo_rotate_left", "mebo_rotate_right",
                "mebo_rotate_cw", "mebo_rotate_ccw",
                "mebo_claw_open", "mebo_claw_close",
                "mebo_joint1_up", "mebo_joint1_down",
                "mebo_joint2_up", "mebo_joint2_down",
            ]
        else:
            commands = ["up", "down", "left", "right", "stop", "pick_up", "throw"]

        response_lower = response_text.lower()
        for cmd in commands:
            if cmd.lower() in response_lower:
                return cmd
        return None

    async def execute_command(self, command: str):
        """Execute command on robot via backend API"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    f"{self.server_origin}/cmd/{command}?device_id={self.robot_id}"
                )
                if response.status_code not in (200, 204):
                    logger.warning(f"Command execution returned {response.status_code}")
        except Exception as e:
            logger.error(f"Failed to execute command: {e}")

    async def execute_ai_decision(self):
        """Execute one AI decision cycle"""
        try:
            if not self.client:
                self.last_error = "Claude API not configured"
                self.error_count += 1
                return

            # Get status and camera feed
            status_text = await self.get_status_report()
            camera_feed = await self.fetch_camera_feed()

            # Prepare prompt for Claude
            examples = "mebo_forward, mebo_reverse, mebo_rotate_left, mebo_rotate_right, mebo_stop, mebo_claw_open, mebo_claw_close"
            prompt = f"""Current robot status:
{status_text}

Analyze the camera feed. Look for obstacles, walls, targets, or free space. Based on what you see and your position, what should the robot do next?
Respond with ONLY the command name (e.g., {examples})"""

            # Call Claude with or without image
            if camera_feed:
                try:
                    # Send with image
                    user_message = {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": camera_feed,
                                },
                            },
                        ],
                    }
                    response = self.client.messages.create(
                        model="claude-opus-4-7",
                        max_tokens=100,
                        system=self.system_prompt,
                        messages=[user_message]
                    )
                except Exception as vision_error:
                    logger.warning(f"Vision error, falling back to text: {vision_error}")
                    # Fallback to text only
                    response = self.client.messages.create(
                        model="claude-opus-4-7",
                        max_tokens=100,
                        system=self.system_prompt,
                        messages=[{"role": "user", "content": prompt}]
                    )
            else:
                # No camera feed, use text only
                logger.warning(f"No camera feed for {self.robot_id}, using text-only")
                response = self.client.messages.create(
                    model="claude-opus-4-7",
                    max_tokens=100,
                    system=self.system_prompt,
                    messages=[{"role": "user", "content": prompt}]
                )

            decision_text = response.content[0].text if response.content else ""
            self.last_decision_text = decision_text
            self.decision_count += 1

            # Log decision
            log = AILog(
                robot_id=self.robot_id,
                status="decision_made",
                decision_text=decision_text
            )
            self.add_log(log)

            # Parse command
            command = self.parse_command_from_response(decision_text)

            if command:
                self.last_command_sent = command

                # Execute command
                await self.execute_command(command)

                # Update position (for MEBO)
                if self.robot_type.lower() == "mebo":
                    self.update_position_from_command(command)

                # Log execution
                log = AILog(
                    robot_id=self.robot_id,
                    status="command_executed",
                    command=command,
                    decision_text=f"Executed: {command} | Pos: ({self.position['x']:.2f}, {self.position['y']:.2f})",
                    position=dict(self.position),
                    heading=self.heading
                )
                self.add_log(log)
            else:
                # No command found
                log = AILog(
                    robot_id=self.robot_id,
                    status="info",
                    decision_text=f"Pending decision: {decision_text}"
                )
                self.add_log(log)

            self.error_count = 0

        except Exception as e:
            self.error_count += 1
            self.last_error = str(e)
            logger.error(f"AI decision error: {e}")

            log = AILog(
                robot_id=self.robot_id,
                status="error",
                error=str(e)
            )
            self.add_log(log)

            if self.error_count > 5:
                self.is_running = False

    async def ai_loop(self):
        """Main AI decision loop"""
        while self.is_running:
            try:
                await self.execute_ai_decision()
            except Exception as e:
                logger.error(f"AI loop error: {e}")

            if self.is_running:
                await asyncio.sleep(self.loop_interval_seconds)

    async def start(self):
        """Start AI mode"""
        if self.is_running:
            return

        self.is_running = True
        self.error_count = 0

        log = AILog(
            robot_id=self.robot_id,
            status="started",
            decision_text=f"AI Mode started. Robot: {self.robot_type.upper()}, Interval: {self.loop_interval_seconds}s"
        )
        self.add_log(log)

        logger.info(f"AI Mode started: robot={self.robot_id}")

        # Start async loop in background
        self.loop_task = asyncio.create_task(self.ai_loop())

    async def stop(self):
        """Stop AI mode"""
        self.is_running = False

        if self.loop_task:
            self.loop_task.cancel()
            try:
                await self.loop_task
            except asyncio.CancelledError:
                pass
            self.loop_task = None

        log = AILog(
            robot_id=self.robot_id,
            status="stopped",
            decision_text=f"AI Mode stopped after {self.decision_count} decisions"
        )
        self.add_log(log)

        logger.info(f"AI Mode stopped: robot={self.robot_id}")

    def to_dict(self) -> dict:
        """Convert instance to dict"""
        return {
            "robot_id": self.robot_id,
            "robot_type": self.robot_type,
            "is_running": self.is_running,
            "position": self.position,
            "heading": self.heading,
            "decision_count": self.decision_count,
            "error_count": self.error_count,
            "last_command_sent": self.last_command_sent,
            "last_decision_text": self.last_decision_text,
            "last_error": self.last_error,
        }
