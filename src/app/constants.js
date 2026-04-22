/*
 ==============================================================================
  WOWE Tactical C2 - Frontend Constants (src/app/constants.js)

  Author:   M. Suleman Anwar
  Date:     2026-01-15

  Purpose:
  - Central place for default configuration and command identifiers.
  - Keep UI components declarative (render from these constants).
 ==============================================================================
*/

export const DEFAULT_SERVER_ORIGIN = "http://localhost:8000";
export const SERVER_ORIGIN_STORAGE_KEY = "wowe.server_origin";

export const FEEDS = [
  { id: "alpha", label: "ALPHA", is_active: true },
  { id: "bravo", label: "BRAVO", is_active: false },
  { id: "charlie", label: "CHARLIE", is_active: false },
  { id: "delta", label: "DELTA", is_active: false },
];

export const COMMANDS = {
  MOVE_UP: "up",
  MOVE_DOWN: "down",
  MOVE_LEFT: "left",
  MOVE_RIGHT: "right",
  STOP: "stop",
  HALT: "halt",
};

export const ACTIONS = [
  { id: "pick_up", label: "PICK UP", cmd: "pick_up" },
  { id: "throw", label: "THROW", cmd: "throw" },
  { id: "strike", label: "STRIKE", cmd: "strike" },
  { id: "burp", label: "BURP", cmd: "burp" },
  { id: "boar", label: "BOAR", cmd: "boar" },
  { id: "roar", label: "ROAR", cmd: "roar" },
];

export const ROBOTS = [
  { id: "alpha", label: "ALPHA" },
  { id: "bravo", label: "BRAVO" },
  { id: "charlie", label: "CHARLIE" },
  { id: "delta", label: "DELTA" },
];

export const EXECUTION_MODES = {
  SERIES: "series",
  PARALLEL: "parallel",
};

// MEBO Robot Constants
export const ROBOT_TYPES = {
  WOWE: "wowe",
  MEBO: "mebo",
};

export const ROBOT_TYPE_STORAGE_KEY = "wowe.robot_type";

export const MEBO_COMMANDS = {
  FORWARD: "mebo_forward",
  REVERSE: "mebo_reverse",
  STOP: "mebo_stop",
  ROTATE_LEFT: "mebo_rotate_left",
  ROTATE_RIGHT: "mebo_rotate_right",
  CLAW_OPEN: "mebo_claw_open",
  CLAW_CLOSE: "mebo_claw_close",
  ROTATE_CW: "mebo_rotate_cw",
  ROTATE_CCW: "mebo_rotate_ccw",
  JOINT1_UP: "mebo_joint1_up",
  JOINT1_DOWN: "mebo_joint1_down",
  JOINT2_UP: "mebo_joint2_up",
  JOINT2_DOWN: "mebo_joint2_down",
};