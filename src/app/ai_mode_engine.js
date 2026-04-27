/*
 ==============================================================================
  WOWE Tactical C2 - AI Mode Engine (src/app/ai_mode_engine.js)

  Author:   M. Suleman Anwar
  Date:     2026-04-27

  Purpose:
  - Manages AI mode autonomous control loops
  - Runs background AI decision-making
  - Executes commands from Claude API
  - Handles concurrent AI instances for different robots
  - Does not interfere with manual/script control

  Notes:
  - Each robot can have its own AI mode instance
  - AI mode runs independently and concurrently
  - Uses Claude API to generate next actions
 ==============================================================================
*/

import { claude } from "../utils/claude.js";
import { send_cmd } from "../api/robot_api.js";
import { add_ai_log, update_ai_logs_display } from "../components/ai_logs_panel.js";
import { ROBOTS, COMMANDS, MEBO_COMMANDS } from "./constants.js";

// Track active AI mode instances per robot
const ai_instances = {};

/**
 * ==============================================================================
 *  create_ai_instance()
 *
 *  Purpose:
 *  - Create a new AI mode instance for a robot
 * ==============================================================================
 */
const create_ai_instance = ({
  robot_type,
  robot_id,
  system_prompt,
  loop_interval_seconds,
  server_origin,
  get_robot_status,
  on_status_change,
}) => {
  return {
    robot_type,
    robot_id,
    system_prompt,
    loop_interval_seconds,
    server_origin,
    get_robot_status,
    on_status_change,
    is_running: false,
    loop_timeout: null,
    error_count: 0,
    decision_count: 0,
    last_decision_text: "",
    last_command_sent: null,
    last_error: null,
  };
};

/**
 * ==============================================================================
 *  get_status_report()
 *
 *  Purpose:
 *  - Generate a status report for AI decision-making
 * ==============================================================================
 */
const get_status_report = async (robot_id, get_robot_status) => {
  try {
    const status = await get_robot_status(robot_id);
    return `
Robot ID: ${robot_id}
Status: ${JSON.stringify(status, null, 2)}
Timestamp: ${new Date().toISOString()}
    `.trim();
  } catch (error) {
    return `
Robot ID: ${robot_id}
Error getting status: ${error.message}
Timestamp: ${new Date().toISOString()}
    `.trim();
  }
};

/**
 * ==============================================================================
 *  parse_command_from_response()
 *
 *  Purpose:
 *  - Extract command from Claude's response
 *  - Looks for command names based on robot type
 * ==============================================================================
 */
const parse_command_from_response = (response_text, robot_type) => {
  // Valid command patterns based on robot type
  const robot_type_lower = (robot_type || "wowe").toLowerCase();

  const command_patterns =
    robot_type_lower === "mebo"
      ? [
          "mebo_move_forward",
          "mebo_move_backward",
          "mebo_rotate_left",
          "mebo_rotate_right",
          "mebo_stop",
          "mebo_claw_open",
          "mebo_claw_close",
        ]
      : [
          "move_up",
          "move_down",
          "move_left",
          "move_right",
          "stop",
          "pick_up",
          "throw",
        ];

  // Search for command in response (case-insensitive)
  for (const cmd of command_patterns) {
    if (response_text.toLowerCase().includes(cmd.toLowerCase())) {
      return cmd;
    }
  }

  // If no command found, return null
  return null;
};

/**
 * ==============================================================================
 *  execute_ai_decision()
 *
 *  Purpose:
 *  - Execute a single AI decision cycle
 * ==============================================================================
 */
const execute_ai_decision = async (instance) => {
  const {
    robot_type,
    robot_id,
    system_prompt,
    server_origin,
    get_robot_status,
    on_status_change,
  } = instance;

  try {
    // Get current robot status
    const status_report = await get_status_report(robot_id, get_robot_status);

    // Ask Claude for next action
    const prompt = `Current robot status:
${status_report}

Based on this status, what should the robot do next?
Respond with ONLY the command name (e.g., move_up, move_down, stop, pick_up, etc.)`;

    const decision_text = await claude.ask(prompt, system_prompt);

    instance.last_decision_text = decision_text;
    instance.decision_count++;

    // Log Claude's decision
    add_ai_log({
      robot_id,
      status: "decision_made",
      decision_text,
    });

    // Parse command from response based on robot type
    const command = parse_command_from_response(decision_text, robot_type);

    if (command) {
      instance.last_command_sent = command;

      // Execute command
      await send_cmd({
        cmd: command,
        device_id: robot_id,
        server_origin,
      });

      // Log executed command
      add_ai_log({
        robot_id,
        status: "command_executed",
        command,
        decision_text: `Executed: ${command}`,
      });

      on_status_change({
        robot_id,
        status: "decision_executed",
        command,
        decision: decision_text,
      });
    } else {
      // Log pending decision (no command matched)
      add_ai_log({
        robot_id,
        status: "info",
        decision_text: `Pending decision: ${decision_text}`,
      });

      on_status_change({
        robot_id,
        status: "decision_pending",
        decision: decision_text,
      });
    }

    // Update logs display
    update_ai_logs_display();
    instance.error_count = 0;
  } catch (error) {
    instance.error_count++;
    instance.last_error = error.message;

    on_status_change({
      robot_id,
      status: "error",
      error: error.message,
      error_count: instance.error_count,
    });

    // Stop if too many errors
    if (instance.error_count > 5) {
      stop_ai_mode(instance.robot_id);
    }
  }
};

/**
 * ==============================================================================
 *  ai_loop()
 *
 *  Purpose:
 *  - Main AI decision loop that runs in background
 * ==============================================================================
 */
const ai_loop = async (instance) => {
  if (!instance.is_running) return;

  try {
    // Execute decision
    await execute_ai_decision(instance);
  } catch (error) {
    // Log error
    add_ai_log({
      robot_id: instance.robot_id,
      status: "error",
      error: error.message,
    });
    update_ai_logs_display();
  }

  // Schedule next decision
  if (instance.is_running) {
    instance.loop_timeout = setTimeout(() => {
      ai_loop(instance);
    }, instance.loop_interval_seconds * 1000);
  }
};

/**
 * ==============================================================================
 *  start_ai_mode()
 *
 *  Purpose:
 *  - Start AI mode for a specific robot
 * ==============================================================================
 */
export const start_ai_mode = ({
  robot_type = "wowe",
  robot_id,
  system_prompt,
  loop_interval_seconds = 3,
  server_origin,
  get_robot_status,
  on_status_change,
}) => {
  // Stop existing instance if running
  if (ai_instances[robot_id]?.is_running) {
    stop_ai_mode(robot_id);
  }

  // Create new instance
  const instance = create_ai_instance({
    robot_type,
    robot_id,
    system_prompt,
    loop_interval_seconds: Math.max(1, Math.min(60, loop_interval_seconds)),
    server_origin,
    get_robot_status,
    on_status_change,
  });

  ai_instances[robot_id] = instance;
  instance.is_running = true;

  // Log start
  add_ai_log({
    robot_id,
    status: "started",
    decision_text: `AI Mode started with prompt: "${system_prompt.substring(0, 50)}..."`,
  });
  update_ai_logs_display();

  // Start the loop
  on_status_change({
    robot_id,
    status: "started",
  });

  ai_loop(instance);
};

/**
 * ==============================================================================
 *  stop_ai_mode()
 *
 *  Purpose:
 *  - Stop AI mode for a specific robot
 * ==============================================================================
 */
export const stop_ai_mode = (robot_id) => {
  const instance = ai_instances[robot_id];
  if (!instance) return;

  instance.is_running = false;

  if (instance.loop_timeout) {
    clearTimeout(instance.loop_timeout);
    instance.loop_timeout = null;
  }

  // Log stop
  add_ai_log({
    robot_id,
    status: "stopped",
    decision_text: `AI Mode stopped after ${instance.decision_count} decisions`,
  });
  update_ai_logs_display();

  if (instance.on_status_change) {
    instance.on_status_change({
      robot_id,
      status: "stopped",
    });
  }
};

/**
 * ==============================================================================
 *  is_ai_mode_running()
 *
 *  Purpose:
 *  - Check if AI mode is running for a robot
 * ==============================================================================
 */
export const is_ai_mode_running = (robot_id) => {
  return ai_instances[robot_id]?.is_running ?? false;
};

/**
 * ==============================================================================
 *  get_ai_instance_info()
 *
 *  Purpose:
 *  - Get detailed info about an AI instance
 * ==============================================================================
 */
export const get_ai_instance_info = (robot_id) => {
  const instance = ai_instances[robot_id];
  if (!instance) return null;

  return {
    robot_id: instance.robot_id,
    is_running: instance.is_running,
    system_prompt: instance.system_prompt,
    loop_interval_seconds: instance.loop_interval_seconds,
    decision_count: instance.decision_count,
    error_count: instance.error_count,
    last_decision_text: instance.last_decision_text,
    last_command_sent: instance.last_command_sent,
    last_error: instance.last_error,
  };
};

/**
 * ==============================================================================
 *  stop_all_ai_modes()
 *
 *  Purpose:
 *  - Stop all active AI mode instances (cleanup on app shutdown)
 * ==============================================================================
 */
export const stop_all_ai_modes = () => {
  for (const robot_id in ai_instances) {
    stop_ai_mode(robot_id);
  }
};

/**
 * ==============================================================================
 *  get_all_ai_instances()
 *
 *  Purpose:
 *  - Get all active AI instances
 * ==============================================================================
 */
export const get_all_ai_instances = () => {
  return Object.keys(ai_instances).reduce((acc, robot_id) => {
    if (ai_instances[robot_id].is_running) {
      acc[robot_id] = get_ai_instance_info(robot_id);
    }
    return acc;
  }, {});
};
