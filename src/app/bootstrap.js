/*
 ==============================================================================
  WOWE Tactical C2 - App Bootstrap / Wiring (src/app/bootstrap.js)

  Author:   M. Suleman Anwar
  Date:     2026-01-15

  Purpose:
  - Compose UI components into the full dashboard layout
  - Bind all UI events (buttons, keyboard shortcuts)
  - Run periodic loops:
      - Video refresh loop (polls /video/{feed_id})
      - Health loop (polls /health)
  - Maintain small UI state (server origin + sequence steps)
 ==============================================================================
*/

import { check_health, get_mjpeg_stream_url, get_server_origin, send_cmd, send_halt, send_script, send_sequence, set_server_origin } from "../api/robot_api.js";
import { COMMANDS, FEEDS, EXECUTION_MODES, ROBOTS, ROBOT_TYPES, ROBOT_TYPE_STORAGE_KEY, MEBO_COMMANDS } from "./constants.js";
import { parse_simple_json_script } from "./script_engine.js";
import { render_app_shell } from "../components/app_shell.js?v=sidebar7";
import { render_control_panel, render_control_panel_content } from "../components/control_panel.js?v=cp2";
import { render_mebo_control_panel_content } from "../components/mebo_control_panel.js";
import { load_sequence_steps, render_sequence_editor, render_sequence_list, save_sequence_steps } from "../components/sequence_editor.js";
// import { load_queues, load_execution_mode, render_queue_manager, render_queue_list, save_queues, save_execution_mode } from "../components/queue_manager.js";
import { load_script_text, render_script_manager, save_script_text } from "../components/script_manager.js";
import { render_video_wall } from "../components/video_wall.js";
import { load_claude_api_key, save_claude_api_key, clear_claude_api_key, load_claude_model, save_claude_model, render_config_card } from "../components/config_panel.js?v=settings3";
import { load_ai_mode_config, save_ai_mode_config, render_ai_mode_card } from "../components/ai_mode_panel.js";
import { clear_ai_logs } from "../components/ai_logs_panel.js";
import { claude } from "../utils/claude.js";
import { start_ai_mode, stop_ai_mode, is_ai_mode_running, get_ai_instance_info } from "./ai_mode_engine.js";
import { el, mount, qs, qsa } from "../utils/dom.js";
import { setup_joystick, setup_vertical_slider, setup_horizontal_slider } from "../utils/joystick.js";

/**
 * ==============================================================================
 *  set_conn_pill()
 *
 *  Purpose:
 *  - Update the UI health pill (ONLINE/OFFLINE) in the top bar
 * ==============================================================================
 */
const set_conn_pill = ({ element, is_online, text }) => {
  // Update ONLINE/OFFLINE indicator on the top-right of the UI.
  element.className = `conn ${is_online ? "conn--ok" : "conn--bad"}`;
  element.textContent = text ?? (is_online ? "ONLINE" : "OFFLINE");
};

/**
 * ==============================================================================
 *  set_signal()
 *
 *  Purpose:
 *  - Toggle the "NO SIGNAL" overlay for a feed tile
 * ==============================================================================
 */
const set_signal = ({ feed_id, has_signal }) => {
  // Toggle the "NO SIGNAL" overlay if image loads fail.
  const tile = document.querySelector(`[data-feed-id="${feed_id}"]`);
  if (!tile) return;
  tile.classList.toggle("feed--no-signal", !has_signal);
};

/**
 * ==============================================================================
 *  start_mjpeg_stream()
 *
 *  Purpose:
 *  - Attach an <img> element to the backend MJPEG stream endpoint.
 *
 * Notes:
 * - MJPEG uses one long-lived HTTP connection and updates continuously,
 *   which is smoother than polling individual JPEG frames.
 * ==============================================================================
 */
const start_mjpeg_stream = ({ feed_id, server_origin }) => {
  const img = document.getElementById(`feed-img-${feed_id}`);
  if (!img) return;

  img.onload = () => set_signal({ feed_id, has_signal: true });
  img.onerror = () => set_signal({ feed_id, has_signal: false });

  img.src = get_mjpeg_stream_url({ feed_id, server_origin });
};

/**
 * ==============================================================================
 *  get_target_device_id()
 *
 *  Purpose:
 *  - Read robot id from the visible #robot-select (must match ESP32 /mebo/next/{id}).
 *  - Falls back to robot_ref if the control is missing.
 * ==============================================================================
 */
const get_target_device_id = ({ robot_ref }) => {
  const sel = document.getElementById("robot-select");
  if (sel && typeof sel.value === "string") {
    const v = sel.value.trim().toLowerCase();
    if (ROBOTS.some((r) => r.id === v)) return v;
  }
  return robot_ref.get();
};

/**
 * ==============================================================================
 *  bind_motion_buttons()
 *
 *  Purpose:
 *  - Wire D-pad buttons (UP/DOWN/LEFT/RIGHT/STOP) to POST /cmd/{cmd}
 * ==============================================================================
 */
const bind_motion_buttons = ({ server_origin_ref, robot_ref }) => {
  // Wire D-pad buttons to POST /cmd/{cmd}.
  const bind = ({ id, cmd }) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", async () => {
      await send_cmd({
        cmd,
        device_id: get_target_device_id({ robot_ref }),
        server_origin: server_origin_ref.get(),
      });
    });
  };

  bind({ id: "btn-up", cmd: COMMANDS.MOVE_UP });
  bind({ id: "btn-down", cmd: COMMANDS.MOVE_DOWN });
  bind({ id: "btn-left", cmd: COMMANDS.MOVE_LEFT });
  bind({ id: "btn-right", cmd: COMMANDS.MOVE_RIGHT });
  bind({ id: "btn-stop", cmd: COMMANDS.STOP });
};

/**
 * ==============================================================================
 *  bind_global_halt()
 *
 *  Purpose:
 *  - Wire GLOBAL HALT button and Spacebar to send halt command
 * ==============================================================================
 */
const bind_global_halt = ({ server_origin_ref, robot_ref }) => {
  // Global HALT can be triggered via button or Spacebar.
  const halt_btn = document.getElementById("halt-btn");
  if (halt_btn)
    halt_btn.addEventListener("click", async () => {
      await send_halt({ device_id: get_target_device_id({ robot_ref }), server_origin: server_origin_ref.get() });
    });

  window.addEventListener("keydown", async (event) => {
    if (event.code !== "Space") return;
    // Don't trigger halt if user is typing in an input field, textarea, or select
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
      return;
    }
    event.preventDefault();
    await send_halt({ device_id: get_target_device_id({ robot_ref }), server_origin: server_origin_ref.get() });
  });
};

/**
 * ==============================================================================
 *  bind_keyboard_motion()
 *
 *  Purpose:
 *  - WASD / Arrow keys to move
 *  - Key up sends STOP to prevent runaway movement
 * ==============================================================================
 */
const bind_keyboard_motion = ({ server_origin_ref, robot_ref }) => {
  // Keyboard controls:
  // - WASD / Arrow keys to move
  // - On keyup we send STOP to keep motion controlled
  const key_to_cmd = {
    ArrowUp: COMMANDS.MOVE_UP,
    KeyW: COMMANDS.MOVE_UP,
    ArrowDown: COMMANDS.MOVE_DOWN,
    KeyS: COMMANDS.MOVE_DOWN,
    ArrowLeft: COMMANDS.MOVE_LEFT,
    KeyA: COMMANDS.MOVE_LEFT,
    ArrowRight: COMMANDS.MOVE_RIGHT,
    KeyD: COMMANDS.MOVE_RIGHT,
  };

  let last_cmd = null;

  window.addEventListener("keydown", async (event) => {
    // Don't hijack WASD/arrow keys while user is typing in an input field.
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
      return;
    }
    const cmd = key_to_cmd[event.code];
    if (!cmd) return;
    event.preventDefault();
    if (event.repeat) return;
    last_cmd = cmd;
    await send_cmd({ cmd, device_id: get_target_device_id({ robot_ref }), server_origin: server_origin_ref.get() });
  });

  window.addEventListener("keyup", async (event) => {
    // Don't send STOP while user is typing in an input field.
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
      return;
    }
    const cmd = key_to_cmd[event.code];
    if (!cmd) return;
    event.preventDefault();
    if (last_cmd !== cmd) return;
    last_cmd = null;
    await send_cmd({ cmd: COMMANDS.STOP, device_id: get_target_device_id({ robot_ref }), server_origin: server_origin_ref.get() });
  });
};

/**
 * ==============================================================================
 *  bind_actions()
 *
 *  Purpose:
 *  - Wire action buttons (pick_up/throw/...) to POST /cmd/{cmd}
 *  - If REC is enabled, also append action into the sequence list
 * ==============================================================================
 */
const bind_actions = ({ server_origin_ref, robot_ref, seq_state }) => {
  // Wire action buttons (PICK UP / THROW / etc.) to POST /cmd/{cmd}.
  // If recording is enabled, also append the action into the sequence list.
  const action_buttons = qsa({ selector: "[data-action-cmd]" });

  for (const btn of action_buttons) {
    btn.addEventListener("click", async () => {
      const cmd = btn.getAttribute("data-action-cmd");
      if (!cmd) return;

      if (seq_state.get().is_recording) {
        const { steps } = seq_state.get();
        seq_state.set({ ...seq_state.get(), steps: [...steps, cmd] });
        render_sequence_into_dom({ seq_state });
      }

      await send_cmd({ cmd, device_id: get_target_device_id({ robot_ref }), server_origin: server_origin_ref.get() });
    });
  }
};

/**
 * ==============================================================================
 *  render_sequence_into_dom()
 *
 *  Purpose:
 *  - Re-render sequence list UI and persist steps to localStorage
 * ==============================================================================
 */
const render_sequence_into_dom = ({ seq_state }) => {
  // Re-render sequence steps and persist them to localStorage.
  const list = document.getElementById("seq-list");
  if (!list) return;

  list.replaceChildren(render_sequence_list({ steps: seq_state.get().steps }));
  save_sequence_steps({ steps: seq_state.get().steps });
};

/**
 * ==============================================================================
 *  bind_sequence_editor()
 *
 *  Purpose:
 *  - Wire sequence editor UI:
 *      - add step, remove step
 *      - REC toggle
 *      - PLAY/BROADCAST -> POST /sequence
 * ==============================================================================
 */
const bind_sequence_editor = ({ server_origin_ref, seq_state }) => {
  // Sequence editor supports:
  // - manual add via input + ADD button
  // - remove step
  // - REC toggle
  // - PLAY/BROADCAST (currently both call POST /sequence)
  const input = document.getElementById("seq-input");
  const add = document.getElementById("seq-add");
  const rec = document.getElementById("seq-rec");
  const play = document.getElementById("seq-play");
  const broadcast = document.getElementById("seq-broadcast");
  const list = document.getElementById("seq-list");

  const add_step = () => {
    if (!input) return;
    const step = String(input.value ?? "").trim();
    if (!step) return;

    const { steps } = seq_state.get();
    seq_state.set({ ...seq_state.get(), steps: [...steps, step] });
    input.value = "";
    render_sequence_into_dom({ seq_state });
  };

  if (add) add.addEventListener("click", add_step);
  if (input)
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      add_step();
    });

  if (list)
    list.addEventListener("click", (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const remove_idx = target?.getAttribute?.("data-seq-remove");
      if (remove_idx === null || remove_idx === undefined) return;

      const idx = Number(remove_idx);
      if (!Number.isFinite(idx)) return;

      const { steps } = seq_state.get();
      seq_state.set({ ...seq_state.get(), steps: steps.filter((_, i) => i !== idx) });
      render_sequence_into_dom({ seq_state });
    });

  if (rec)
    rec.addEventListener("click", () => {
      const next = !seq_state.get().is_recording;
      seq_state.set({ ...seq_state.get(), is_recording: next });
      rec.classList.toggle("btn--armed", next);
      rec.textContent = next ? "REC (ON)" : "REC";
    });

  if (play)
    play.addEventListener("click", async () => {
      // UI-first: play = run full sequence for now
      const { steps } = seq_state.get();
      if (steps.length === 0) return;
      await send_sequence({ steps, server_origin: server_origin_ref.get() });
    });

  if (broadcast)
    broadcast.addEventListener("click", async () => {
      const { steps } = seq_state.get();
      if (steps.length === 0) return;
      await send_sequence({ steps, server_origin: server_origin_ref.get() });
    });
};

/**
 * ==============================================================================
 *  bind_server_settings()
 *
 *  Purpose:
 *  - Wire the Backend URL input + SAVE button
 *  - Persists server origin to localStorage and updates refresh targets
 * ==============================================================================
 */
const bind_server_settings = ({ server_origin_ref, on_change }) => {
  // Backend URL is editable in the UI and stored in localStorage.
  const input = document.getElementById("server-origin");
  const save = document.getElementById("save-server-origin");

  if (input) input.value = server_origin_ref.get();
  if (!input || !save) return;

  save.addEventListener("click", () => {
    const next_origin = String(input.value ?? "").trim();
    const result = set_server_origin({ server_origin: next_origin });
    if (!result.is_ok) {
      input.classList.add("input--error");
      return;
    }

    input.classList.remove("input--error");
    server_origin_ref.set(next_origin);
    on_change?.({ server_origin: next_origin });
  });
};

/**
 * ==============================================================================
 *  bind_robot_type_selector()
 *
 *  Purpose:
 *  - Wire robot type selector (WOWE/MEBO) buttons
 *  - Switches between WOWE and MEBO UI
 * ==============================================================================
 */
/**
 * ==============================================================================
 *  bind_ai_mode_panel()
 *
 *  Purpose:
 *  - Wire AI MODE tab button handlers (START / STOP)
 *  - Manage AI mode background loop
 *  - Get robot status for AI decision making
 * ==============================================================================
 */
const bind_ai_mode_panel = ({ server_origin_ref, robot_ref }) => {
  const type_wowe_btn = document.getElementById("ai-type-wowe");
  const type_mebo_btn = document.getElementById("ai-type-mebo");
  const robot_select = document.getElementById("ai-robot-select");
  const prompt_textarea = document.getElementById("ai-system-prompt");
  const interval_input = document.getElementById("ai-loop-interval");
  const start_btn = document.getElementById("ai-start-btn");
  const stop_btn = document.getElementById("ai-stop-btn");
  const status = document.getElementById("ai-mode-status");
  const clear_logs_btn = document.getElementById("ai-clear-logs-btn");

  if (!robot_select || !prompt_textarea || !start_btn || !stop_btn || !status) return;

  let selected_robot_type = load_ai_mode_config().robot_type;

  // Wire robot type selection
  if (type_wowe_btn && type_mebo_btn) {
    const update_type_buttons = (type) => {
      type_wowe_btn.classList.toggle("active", type === "wowe");
      type_mebo_btn.classList.toggle("active", type === "mebo");
    };

    type_wowe_btn.addEventListener("click", () => {
      selected_robot_type = "wowe";
      update_type_buttons("wowe");
    });

    type_mebo_btn.addEventListener("click", () => {
      selected_robot_type = "mebo";
      update_type_buttons("mebo");
    });

    update_type_buttons(selected_robot_type);
  }

  // Wire clear logs button
  if (clear_logs_btn) {
    clear_logs_btn.addEventListener("click", () => {
      clear_ai_logs();
      const logs_list = document.getElementById("ai-logs-list");
      if (logs_list) {
        logs_list.replaceChildren();
        logs_list.append(
          el({
            tag: "div",
            class_name: "ai-logs__empty",
            text: "No AI activity yet. Start AI mode to see logs.",
          })
        );
      }
    });
  }

  // Get current robot status for AI
  const get_robot_status = async (robot_id) => {
    // TODO: Integrate with actual robot API to get status
    // For now, return placeholder status
    return {
      robot_id,
      position: { x: 0, y: 0 },
      battery: 85,
      status: "idle",
      timestamp: new Date().toISOString(),
    };
  };

  const update_status = (message, is_running) => {
    status.textContent = message;
    status.className = `ai-mode__status ${
      is_running ? "ai-mode__status--running" : "ai-mode__status--stopped"
    }`;
  };

  const on_ai_status_change = (info) => {
    const { status: state, robot_id, error, command } = info;

    if (state === "started") {
      update_status(`✓ AI MODE ACTIVE (${robot_id})`, true);
    } else if (state === "stopped") {
      update_status(`⊙ AI MODE STOPPED (${robot_id})`, false);
    } else if (state === "decision_executed") {
      update_status(`⟳ DECISION: ${command} (${robot_id})`, true);
    } else if (state === "error") {
      update_status(`✗ ERROR: ${error}`, true);
    }
  };

  start_btn.addEventListener("click", () => {
    const robot_id = robot_select.value.trim().toLowerCase();
    const system_prompt = prompt_textarea.value.trim();
    const interval_seconds = parseInt(interval_input.value) || 3;

    if (!system_prompt) {
      update_status("✗ System prompt required", false);
      return;
    }

    if (!robot_id) {
      update_status("✗ Select target robot", false);
      return;
    }

    // Save config
    save_ai_mode_config({
      robot_type: selected_robot_type,
      robot_id,
      system_prompt,
      loop_interval_seconds: interval_seconds,
      is_active: true,
    });

    // Start AI mode
    try {
      start_ai_mode({
        robot_type: selected_robot_type,
        robot_id,
        system_prompt,
        loop_interval_seconds: interval_seconds,
        server_origin: server_origin_ref.get(),
        get_robot_status,
        on_status_change: on_ai_status_change,
      });

      update_status(`✓ AI MODE ACTIVE (${robot_id})`, true);
    } catch (error) {
      update_status(`✗ Failed to start: ${error.message}`, false);
    }
  });

  stop_btn.addEventListener("click", () => {
    const robot_id = robot_select.value.trim().toLowerCase();

    stop_ai_mode(robot_id);

    save_ai_mode_config({
      robot_type: selected_robot_type,
      robot_id,
      system_prompt: prompt_textarea.value.trim(),
      loop_interval_seconds: parseInt(interval_input.value) || 3,
      is_active: false,
    });

    update_status(`⊙ AI MODE STOPPED (${robot_id})`, false);
  });

  // Load saved config
  const config = load_ai_mode_config();
  robot_select.value = config.robot_id;
  prompt_textarea.value = config.system_prompt;
  interval_input.value = config.loop_interval_seconds;

  // Show status if AI was running
  if (config.is_active && is_ai_mode_running(config.robot_id)) {
    const info = get_ai_instance_info(config.robot_id);
    if (info) {
      update_status(
        `✓ AI MODE ACTIVE (${info.decision_count} decisions)`,
        true
      );
    }
  }
};

/**
 * ==============================================================================
 *  bind_config_panel()
 *
 *  Purpose:
 *  - Wire CONFIG tab button handlers (SAVE KEY / CLEAR KEY)
 *  - Update status message on save/clear
 * ==============================================================================
 */
const bind_config_panel = () => {
  const api_key_input = document.getElementById("claude-api-key");
  const model_select = document.getElementById("claude-model-select");
  const save_btn = document.getElementById("save-claude-api-key");
  const clear_btn = document.getElementById("clear-claude-api-key");
  const status = document.getElementById("config-status");

  if (!api_key_input || !save_btn || !clear_btn || !status) return;

  api_key_input.value = load_claude_api_key();

  const update_status = (message, is_success) => {
    status.textContent = message;
    status.className = `config__status ${is_success ? "config__status--success" : "config__status--error"}`;
  };

  const clear_status = () => {
    status.textContent = "";
    status.className = "config__status";
  };

  save_btn.addEventListener("click", () => {
    const api_key = api_key_input.value.trim();
    if (!api_key) {
      update_status("API key cannot be empty", false);
      return;
    }
    if (save_claude_api_key(api_key)) {
      update_status("✓ API Key Saved", true);
      setTimeout(clear_status, 3000);
    } else {
      update_status("Failed to save API key", false);
    }
  });

  clear_btn.addEventListener("click", () => {
    clear_claude_api_key();
    api_key_input.value = "";
    update_status("✓ API Key Cleared", true);
    setTimeout(clear_status, 3000);
  });

  if (model_select) {
    model_select.addEventListener("change", () => {
      const selected_model = model_select.value;
      if (save_claude_model(selected_model)) {
        update_status("✓ Model Changed", true);
        setTimeout(clear_status, 3000);
      } else {
        update_status("Failed to change model", false);
      }
    });
  }
};

const render_robot_management_panel = () => {
  const wrap = el({ tag: "section", class_name: "settings__panel" });
  const form = el({ tag: "div", class_name: "settings__robot-form" });
  const actions = el({ tag: "div", class_name: "settings__robot-actions" });

  form.append(
    el({ tag: "label", class_name: "label", attrs: { for: "settings-robot-name" }, text: "Robot Name" }),
    el({ tag: "input", class_name: "input", attrs: { id: "settings-robot-name", placeholder: "BRAVO-2", autocomplete: "off" } }),
    el({ tag: "label", class_name: "label", attrs: { for: "settings-robot-type" }, text: "Robot Type" }),
    el({ tag: "select", class_name: "input", attrs: { id: "settings-robot-type" } }),
    el({ tag: "label", class_name: "label", attrs: { for: "settings-robot-feed" }, text: "Feed / Device Id" }),
    el({ tag: "input", class_name: "input", attrs: { id: "settings-robot-feed", placeholder: "alpha", autocomplete: "off" } })
  );

  actions.append(
    el({ tag: "button", class_name: "btn btn--primary", attrs: { id: "settings-add-robot", type: "button" }, text: "Add + Broadcast" }),
    el({ tag: "button", class_name: "btn btn--ghost", attrs: { id: "settings-clear-robot", type: "button" }, text: "Clear Form" })
  );

  wrap.append(
    el({ tag: "div", class_name: "settings__title", text: "ROBOT MANAGEMENT" }),
    el({
      tag: "div",
      class_name: "settings__subtitle",
      text: "Register robot identity and bind it to an ingest feed before operations.",
    }),
    el({ tag: "div", class_name: "settings__robot-badge", text: `Provisioned Slots: ${ROBOTS.length}` }),
    form,
    actions,
    el({
      tag: "div",
      class_name: "settings__robot-note",
      text: "Tip: use unique names and keep feed/device id aligned with backend routes.",
    })
  );

  const type_select = wrap.querySelector("#settings-robot-type");
  if (type_select) {
    type_select.append(
      el({ tag: "option", attrs: { value: "wowe" }, text: "WOWE" }),
      el({ tag: "option", attrs: { value: "mebo" }, text: "MEBO" })
    );
  }

  const clear_btn = wrap.querySelector("#settings-clear-robot");
  const name_input = wrap.querySelector("#settings-robot-name");
  const feed_input = wrap.querySelector("#settings-robot-feed");
  if (clear_btn && name_input && feed_input && type_select) {
    clear_btn.addEventListener("click", () => {
      name_input.value = "";
      feed_input.value = "";
      type_select.value = "wowe";
    });
  }

  return wrap;
};

const render_settings_overview_panel = () => {
  const wrap = el({ tag: "section", class_name: "settings__panel settings__panel--full" });
  const list = el({ tag: "div", class_name: "settings__robot-list" });

  for (const robot of ROBOTS) {
    const row = el({ tag: "div", class_name: "settings__robot-row" });
    row.append(
      el({ tag: "span", class_name: "settings__robot-name", text: robot.label }),
      el({
        tag: "span",
        class_name: "settings__robot-meta",
        text: `ID: ${robot.id.toUpperCase()} • Feed: ${robot.id}`,
      })
    );
    list.append(row);
  }

  wrap.append(
    el({ tag: "div", class_name: "settings__title", text: "DEPLOYMENT OVERVIEW" }),
    el({
      tag: "div",
      class_name: "settings__subtitle",
      text: "Use this page to manage Claude configuration and robot registration. Operational control remains on Dashboard.",
    }),
    list
  );

  return wrap;
};

const bind_robot_type_selector = ({ robot_type_ref, save_robot_type, switch_right_tab }) => {
  const woweBtn = document.getElementById("robot-type-wowe");
  const meboBtn = document.getElementById("robot-type-mebo");

  const updateButtons = () => {
    const currentType = robot_type_ref.get();
    if (woweBtn) {
      woweBtn.classList.toggle("active", currentType === ROBOT_TYPES.WOWE);
    }
    if (meboBtn) {
      meboBtn.classList.toggle("active", currentType === ROBOT_TYPES.MEBO);
    }
  };

  if (woweBtn) {
    woweBtn.addEventListener("click", () => {
      save_robot_type(ROBOT_TYPES.WOWE);
      updateButtons();
      switch_right_tab("control");
    });
  }

  if (meboBtn) {
    meboBtn.addEventListener("click", () => {
      save_robot_type(ROBOT_TYPES.MEBO);
      updateButtons();
      switch_right_tab("control");
    });
  }

  updateButtons();
};

/**
 * ==============================================================================
 *  bind_robot_selector()
 *
 *  Purpose:
 *  - Wire robot selection dropdown (shared by WOWE and MEBO)
 * ==============================================================================
 */
const bind_robot_selector = ({ robot_ref }) => {
  const select = document.getElementById("robot-select");
  if (!select) return;

  // Set initial value
  select.value = robot_ref.get();

  select.addEventListener("change", () => {
    const selected = select.value;
    if (ROBOTS.some(r => r.id === selected)) {
      robot_ref.set(selected);
      localStorage.setItem("wowe.selected_robot", selected);

      // Update subtitle if it exists
      const subtitle = document.querySelector(".card__subtitle");
      if (subtitle) {
        const robot_label = ROBOTS.find(r => r.id === selected)?.label || selected.toUpperCase();
        subtitle.textContent = `[${robot_label}]`;
      }
    }
  });
};

/**
 * ==============================================================================
 *  bind_mebo_controls()
 *
 *  Purpose:
 *  - Wire MEBO game controller controls (joystick, sliders, stop button)
 *  - Completely separate from WOWE controls
 * ==============================================================================
 */
const bind_mebo_controls = ({ server_origin_ref, robot_ref }) => {
  // Command sender helper - fire and forget for better responsiveness
  const send_mebo_cmd = (cmd) => {
    // Don't await - fire and forget for real-time control
    send_cmd({
      cmd,
      device_id: get_target_device_id({ robot_ref }),
      server_origin: server_origin_ref.get(),
    }).then((result) => {
      if (!result.is_ok) {
        const did = get_target_device_id({ robot_ref });
        console.warn("MEBO command rejected:", cmd, "device_id=", did, result.error);
      }
    }).catch((err) => {
      console.warn("MEBO command failed:", err);
    });
  };

  // Setup movement joystick
  setup_joystick({
    joystickId: "mebo-joystick",
    maxDistance: 27,
    onCommand: send_mebo_cmd,
  });

  // Setup claw slider
  setup_vertical_slider({
    sliderId: "mebo-slider-claw",
    trackId: "mebo-slider-claw-track",
    onUpCommand: MEBO_COMMANDS.CLAW_OPEN,
    onDownCommand: MEBO_COMMANDS.CLAW_CLOSE,
    onCommand: send_mebo_cmd,
    onStopCommand: MEBO_COMMANDS.STOP,
  });

  // Setup rotation slider
  setup_horizontal_slider({
    sliderId: "mebo-slider-rotation",
    trackId: "mebo-slider-rotation-track",
    onLeftCommand: MEBO_COMMANDS.ROTATE_CCW,
    onRightCommand: MEBO_COMMANDS.ROTATE_CW,
    onCommand: send_mebo_cmd,
    onStopCommand: MEBO_COMMANDS.STOP,
  });

  // Setup joint 1 slider
  setup_vertical_slider({
    sliderId: "mebo-slider-joint1",
    trackId: "mebo-slider-joint1-track",
    onUpCommand: MEBO_COMMANDS.JOINT1_UP,
    onDownCommand: MEBO_COMMANDS.JOINT1_DOWN,
    onCommand: send_mebo_cmd,
    onStopCommand: MEBO_COMMANDS.STOP,
  });

  // Setup joint 2 slider
  setup_vertical_slider({
    sliderId: "mebo-slider-joint2",
    trackId: "mebo-slider-joint2-track",
    onUpCommand: MEBO_COMMANDS.JOINT2_UP,
    onDownCommand: MEBO_COMMANDS.JOINT2_DOWN,
    onCommand: send_mebo_cmd,
    onStopCommand: MEBO_COMMANDS.STOP,
  });

  // Stop button
  const stopBtn = document.getElementById("mebo-stop-btn");
  if (stopBtn) {
    stopBtn.addEventListener("click", async () => {
      await send_mebo_cmd(MEBO_COMMANDS.STOP);
    });
  }
};

/**
 * ==============================================================================
 *  create_ref()
 *
 *  Purpose:
 *  - Minimal mutable reference object (tiny state container)
 * ==============================================================================
 */
const create_ref = (value) => ({
  // Minimal mutable reference (so we don't need a framework state container).
  get: () => value,
  set: (next) => {
    value = next;
  },
});

/**
 * ==============================================================================
 *  bootstrap_app()
 *
 *  Purpose:
 *  - Main UI entry:
 *      - mount app shell
 *      - render video wall + right panels
 *      - bind handlers
 *      - start polling loops
 * ==============================================================================
 */

/**
 * ==============================================================================
 *  bind_queue_manager()
 *
 *  Purpose:
 *  - Wire queue manager UI: create, edit, delete queues, add/remove steps, execute
 * ==============================================================================
 */
// const bind_queue_manager = ({ queue_state, execution_mode_ref, server_origin_ref, on_state_change }) => {
//   const name_input = document.getElementById("queue-name-input");
//   const create_btn = document.getElementById("queue-create-btn");
//   const execute_btn = document.getElementById("queue-execute-btn");
//   const execute_btn_text = document.getElementById("execute-btn-text");
//   const radio_series = document.getElementById("radio-series");
//   const radio_parallel = document.getElementById("radio-parallel");

//   // Create queue
//   const robot_select = document.getElementById("queue-robot-select");
//   if (create_btn && name_input && robot_select) {
//     create_btn.addEventListener("click", () => {
//       const name = String(name_input.value ?? "").trim();
//       if (!name) return;

//       const robot_id = String(robot_select.value ?? ROBOTS[0].id);
//       const queues = queue_state.get().queues;
//       const new_queue = {
//         id: `queue-${Date.now()}`,
//         name,
//         robot_id,
//         steps: [],
//       };
//       const updated_queues = [...queues, new_queue];
//       queue_state.set({ ...queue_state.get(), queues: updated_queues });
//       save_queues({ queues: updated_queues });
//       name_input.value = "";
//       robot_select.value = ROBOTS[0].id;
//       on_state_change();
//     });
//   }

//   // Toggle queue expansion
//   const handle_toggle_expand = (queue_id) => {
//     const state = queue_state.get();
//     const new_expanded = state.expanded_queue_id === queue_id ? null : queue_id;
//     queue_state.set({ ...state, expanded_queue_id: new_expanded });
//     on_state_change();
//   };

//   // Delete queue
//   const handle_delete = (queue_id) => {
//     const state = queue_state.get();
//     queue_state.set({
//       ...state,
//       queues: state.queues.filter((q) => q.id !== queue_id),
//       expanded_queue_id: state.expanded_queue_id === queue_id ? null : state.expanded_queue_id,
//     });
//     save_queues({ queues: queue_state.get().queues });
//     on_state_change();
//   };

//   // Add step to queue
//   const handle_add_step = (queue_id, step_data) => {
//     const state = queue_state.get();
//     const queues = state.queues.map((q) => {
//       if (q.id === queue_id) {
//         // Support both old format (string) and new format (object with cmd)
//         const step = typeof step_data === "string" ? step_data : (step_data.cmd || step_data);
//         return { ...q, steps: [...(q.steps || []), step] };
//       }
//       return q;
//     });
//     queue_state.set({ ...state, queues });
//     save_queues({ queues });
//     on_state_change();
//   };

//   // Remove step from queue
//   const handle_remove_step = (queue_id, step_idx) => {
//     const state = queue_state.get();
//     const queues = state.queues.map((q) => {
//       if (q.id === queue_id) {
//         return { ...q, steps: q.steps.filter((_, i) => i !== step_idx) };
//       }
//       return q;
//     });
//     queue_state.set({ ...state, queues });
//     save_queues({ queues });
//     on_state_change();
//   };

//   // Execution mode change
//   if (radio_series && radio_parallel) {
//     const update_exec_mode = () => {
//       const mode = radio_series.checked ? EXECUTION_MODES.SERIES : EXECUTION_MODES.PARALLEL;
//       execution_mode_ref.set(mode);
//       save_execution_mode({ mode });
//       if (execute_btn_text) {
//         execute_btn_text.textContent = `Execute All Queues (${mode})`;
//       }
//     };
//     radio_series.addEventListener("change", update_exec_mode);
//     radio_parallel.addEventListener("change", update_exec_mode);
//   }

//   // Execute all queues
//   if (execute_btn) {
//     execute_btn.addEventListener("click", async () => {
//       const queues = queue_state.get().queues;
//       if (queues.length === 0) return;

//       const mode = execution_mode_ref.get();
//       // TODO: Implement actual execution logic (series vs parallel)
//       console.log("Execute queues:", queues, "Mode:", mode);
//     });
//   }

//   return {
//     handle_toggle_expand,
//     handle_delete,
//     handle_add_step,
//     handle_remove_step,
//   };
// };

/**
 * ==============================================================================
 *  bind_script_manager()
 *
 *  Purpose:
 *  - Wire Script Manager UI (UI-first; engine comes later):
 *      - persist script text
 *      - validate button shows placeholder result
 *      - simulate button shows placeholder timeline/log
 * ==============================================================================
 */
const bind_script_manager = ({ server_origin_ref }) => {
  const textarea = document.getElementById("script-textarea");
  const validate_btn = document.getElementById("script-validate-btn");
  const run_btn = document.getElementById("script-run-btn");
  const abort_btn = document.getElementById("script-abort-btn");
  const status = document.getElementById("script-status");
  const log = document.getElementById("script-log");

  const abort_ref = create_ref(false);

  // Remove old event listeners by cloning buttons (prevents duplicate bindings on tab switches)
  if (validate_btn && validate_btn.parentNode) {
    const new_validate_btn = validate_btn.cloneNode(true);
    validate_btn.parentNode.replaceChild(new_validate_btn, validate_btn);
  }
  if (run_btn && run_btn.parentNode) {
    const new_run_btn = run_btn.cloneNode(true);
    run_btn.parentNode.replaceChild(new_run_btn, run_btn);
  }
  if (abort_btn && abort_btn.parentNode) {
    const new_abort_btn = abort_btn.cloneNode(true);
    abort_btn.parentNode.replaceChild(new_abort_btn, abort_btn);
  }

  // Re-get buttons after cloning (they have new references)
  const validate_btn_clean = document.getElementById("script-validate-btn");
  const run_btn_clean = document.getElementById("script-run-btn");
  const abort_btn_clean = document.getElementById("script-abort-btn");

  if (textarea) {
    textarea.value = load_script_text();
    textarea.addEventListener("input", () => save_script_text({ script_text: textarea.value }));
  }

  const set_status = ({ lines }) => {
    if (!status) return;
    status.replaceChildren(el({ tag: "div", class_name: "script__section-title", text: "VALIDATION" }));
    for (const line of lines) status.append(el({ tag: "div", class_name: line.class_name, text: line.text }));
  };

  const now = () => new Date().toLocaleTimeString();

  const set_log = (text) => {
    if (!log) return;
    log.textContent = text;
  };

  const append_log = (line) => {
    const prev = log ? String(log.textContent ?? "") : "";
    const next = prev && prev !== "—" ? `${prev}\n${line}` : line;
    set_log(next);
  };

  if (validate_btn_clean)
    validate_btn_clean.addEventListener("click", () => {
      const text = textarea ? String(textarea.value ?? "") : "";
      if (text.trim().length === 0) {
        set_status({
          lines: [
            { class_name: "script-kv script-kv--bad", text: "Status: ERROR (empty script)" },
            { class_name: "script-kv script-kv--muted", text: "AST: —" },
            { class_name: "script-kv script-kv--muted", text: "Duration: —" },
          ],
        });
        if (log) log.textContent = `[${now()}] validate: error (empty script)`;
        return;
      }

      const result = parse_simple_json_script({ script_text: text });
      if (!result.is_ok) {
        set_status({
          lines: [
            { class_name: "script-kv script-kv--bad", text: `Status: ERROR (${result.error})` },
            { class_name: "script-kv script-kv--muted", text: "AST: —" },
            { class_name: "script-kv script-kv--muted", text: "Duration: —" },
          ],
        });
        set_log(`[${now()}] validate: error\n${result.error}`);
        return;
      }

      const ast = result.ast;
      set_status({
        lines: [
          { class_name: "script-kv script-kv--ok", text: `Status: OK (${ast.type.toUpperCase()})` },
          { class_name: "script-kv script-kv--muted", text: `Robots: ${ast.robots.map((r) => r.robot_id.toUpperCase()).join(", ")}` },
          { class_name: "script-kv script-kv--muted", text: "Duration: (measured during run)" },
        ],
      });
      set_log(`[${now()}] validate: ok (${ast.type})`);
    });

  if (run_btn_clean)
    run_btn_clean.addEventListener("click", async () => {
      const text = textarea ? String(textarea.value ?? "") : "";

      // Step 1: Validate JSON format
      const parsed = parse_simple_json_script({ script_text: text });
      if (!parsed.is_ok) {
        set_status({
          lines: [
            { class_name: "script-kv script-kv--bad", text: `Status: ERROR (${parsed.error})` },
            { class_name: "script-kv script-kv--muted", text: "AST: —" },
            { class_name: "script-kv script-kv--muted", text: "Duration: —" },
          ],
        });
        set_log(`[${now()}] Validation failed: ${parsed.error}`);
        return;
      }

      // Step 2: Parse JSON to get script object
      let script_obj;
      try {
        script_obj = JSON.parse(text);
      } catch (e) {
        set_status({
          lines: [
            { class_name: "script-kv script-kv--bad", text: `Status: ERROR (Invalid JSON)` },
            { class_name: "script-kv script-kv--muted", text: "AST: —" },
            { class_name: "script-kv script-kv--muted", text: "Duration: —" },
          ],
        });
        set_log(`[${now()}] JSON parse error: ${String(e?.message ?? e)}`);
        return;
      }

      // Step 3: Send validated script to backend
      const server_origin = server_origin_ref?.get?.() ?? get_server_origin();
      set_status({
        lines: [
          { class_name: "script-kv script-kv--ok", text: `Status: RUNNING SIMULATION...` },
          { class_name: "script-kv script-kv--muted", text: `Mode: ${parsed.ast.type.toUpperCase()}` },
          { class_name: "script-kv script-kv--muted", text: `Robots: ${parsed.ast.robots.map((r) => r.robot_id.toUpperCase()).join(", ")}` },
        ],
      });
      set_log(`[${now()}] Running simulation...`);

      const result = await send_script({ script: script_obj, server_origin });

      if (result.is_ok) {
        set_status({
          lines: [
            { class_name: "script-kv script-kv--ok", text: `Status: SIMULATION COMPLETE` },
            { class_name: "script-kv script-kv--muted", text: `Mode: ${parsed.ast.type.toUpperCase()}` },
            { class_name: "script-kv script-kv--muted", text: `Message: ${result.data?.message ?? "Script queued for execution"}` },
          ],
        });
        set_log(`[${now()}] Simulation completed successfully`);
      } else {
        set_status({
          lines: [
            { class_name: "script-kv script-kv--bad", text: `Status: ERROR` },
            { class_name: "script-kv script-kv--muted", text: `Error: ${result.error}` },
            { class_name: "script-kv script-kv--muted", text: "Duration: —" },
          ],
        });
        set_log(`[${now()}] Failed to send script: ${result.error}`);
      }
    });

  if (abort_btn_clean)
    abort_btn_clean.addEventListener("click", async () => {
      abort_ref.set(true);
      set_status({
        lines: [
          { class_name: "script-kv script-kv--bad", text: "Status: ABORTING… (sending HALT to all robots)" },
          { class_name: "script-kv script-kv--muted", text: "AST: —" },
          { class_name: "script-kv script-kv--muted", text: "Duration: —" },
        ],
      });
      set_log(`[${now()}] abort: requested`);

      // Safety: stop all robots immediately (reuses existing backend endpoint).
      const server_origin = server_origin_ref?.get?.() ?? get_server_origin();
      await Promise.allSettled(ROBOTS.map((r) => send_halt({ device_id: r.id, server_origin })));

      set_status({
        lines: [
          { class_name: "script-kv script-kv--bad", text: "Status: ABORTED (HALT sent)" },
          { class_name: "script-kv script-kv--muted", text: "AST: —" },
          { class_name: "script-kv script-kv--muted", text: "Duration: —" },
        ],
      });
      append_log(`[${now()}] abort: halt sent to all robots`);
    });
};

/**
 * ==============================================================================
 *  render_queue_manager_into_dom()
 *
 *  Purpose:
 *  - Re-render queue list UI
 * ==============================================================================
 */
// const render_queue_manager_into_dom = ({ queue_state, handlers }) => {
//   const container = document.getElementById("queue-list-container");
//   if (!container) return;

//   const queues = queue_state.get().queues;
//   const expanded_queue_id = queue_state.get().expanded_queue_id;

//   container.replaceChildren(
//     render_queue_list({
//       queues,
//       expanded_queue_id,
//       on_toggle_expand: handlers.handle_toggle_expand,
//       on_delete: handlers.handle_delete,
//       on_add_step: handlers.handle_add_step,
//       on_remove_step: handlers.handle_remove_step,
//     })
//   );
// };

export const bootstrap_app = ({ root_element_id }) => {
  // Main bootstrap:
  // - mount shell
  // - render panels
  // - bind handlers
  // - start loops
  const root = document.getElementById(root_element_id);
  if (!root) return;

  mount({ root, child: render_app_shell() });

  const left = qs({ selector: "#left" });
  const right = qs({ selector: "#right" });
  const dashboard_layout = qs({ selector: "#dashboard-layout" });
  const settings_view = qs({ selector: "#settings-view" });
  const nav_dashboard = qs({ selector: "#nav-dashboard" });
  const nav_settings = qs({ selector: "#nav-settings" });
  const bottombar = qs({ selector: ".bottombar" });
  const app_shell = qs({ selector: ".c2" });
  if (!left || !right) return;

  // Initialize shared state
  const server_origin_ref = create_ref(get_server_origin());
  const seq_state = create_ref({ steps: load_sequence_steps(), is_recording: false });

  // Robot selection state (default to "alpha", stored in localStorage)
  const ROBOT_STORAGE_KEY = "wowe.selected_robot";
  const load_selected_robot = () => {
    const stored = localStorage.getItem(ROBOT_STORAGE_KEY);
    return stored && ROBOTS.some(r => r.id === stored) ? stored : ROBOTS[0].id;
  };
  const robot_ref = create_ref(load_selected_robot());

  // Robot type state (WOWE or MEBO, stored in localStorage)
  const load_robot_type = () => {
    const stored = localStorage.getItem(ROBOT_TYPE_STORAGE_KEY);
    return stored === ROBOT_TYPES.MEBO ? ROBOT_TYPES.MEBO : ROBOT_TYPES.WOWE;
  };
  const robot_type_ref = create_ref(load_robot_type());
  const save_robot_type = (type) => {
    robot_type_ref.set(type);
    localStorage.setItem(ROBOT_TYPE_STORAGE_KEY, type);
  };

  // Queue manager state (will be initialized when queue tab is opened)
  // let queue_state_ref = null;
  // let execution_mode_ref = null;
  // let queue_handlers = null;

  // Initial render: Dashboard view
  left.append(render_video_wall({ feeds: FEEDS }));
  const control_panel = render_control_panel();
  const legacy_config_tab = control_panel.querySelector("#tab-config");
  if (legacy_config_tab) legacy_config_tab.remove();
  right.append(control_panel, render_sequence_editor());

  // Tab switching (on right side control panel)
  let current_right_tab = "control";
  const sequence_editor_container = qs({ selector: "#right" });

  const switch_right_tab = (tab_name) => {
    current_right_tab = tab_name;
    const tab_content = document.getElementById("tab-content");
    if (!tab_content || !sequence_editor_container) return;

    if (tab_name === "control") {
      const robot_type = robot_type_ref.get();

      if (robot_type === ROBOT_TYPES.MEBO) {
        // Render MEBO control panel
        tab_content.replaceChildren(render_mebo_control_panel_content());

        // Hide sequence editor for MEBO (MEBO doesn't use script tab)
        const seq_list = document.getElementById("seq-list");
        if (seq_list) {
          const seq_editor = seq_list.closest(".card");
          if (seq_editor) {
            seq_editor.style.display = "none";
          }
        }

        // Hide SCRIPT tab for MEBO
        const script_tab = document.getElementById("tab-script");
        if (script_tab) {
          script_tab.style.display = "none";
        }

        // Bind MEBO handlers
        bind_server_settings({
          server_origin_ref,
          on_change: () => {
            for (const feed of FEEDS) start_mjpeg_stream({ feed_id: feed.id, server_origin: server_origin_ref.get() });
          },
        });
        bind_robot_type_selector({ robot_type_ref, save_robot_type, switch_right_tab });
        bind_robot_selector({ robot_ref });
        bind_mebo_controls({ server_origin_ref, robot_ref });
      } else {
        // Render WOWE control panel (ORIGINAL - NO CHANGES)
        tab_content.replaceChildren(render_control_panel_content());

        // Show sequence editor (find by seq-list id)
        const seq_list = document.getElementById("seq-list");
        if (seq_list) {
          const seq_editor = seq_list.closest(".card");
          if (seq_editor) {
            seq_editor.style.display = "";
          }
        }

        // Show SCRIPT tab for WOWE
        const script_tab = document.getElementById("tab-script");
        if (script_tab) {
          script_tab.style.display = "";
        }

        // Re-bind control panel handlers (ORIGINAL WOWE HANDLERS - NO CHANGES)
        bind_server_settings({
          server_origin_ref,
          on_change: () => {
            for (const feed of FEEDS) start_mjpeg_stream({ feed_id: feed.id, server_origin: server_origin_ref.get() });
          },
        });
        bind_robot_type_selector({ robot_type_ref, save_robot_type, switch_right_tab });
        bind_robot_selector({ robot_ref });
        bind_motion_buttons({ server_origin_ref, robot_ref });
        bind_keyboard_motion({ server_origin_ref, robot_ref });
        bind_actions({ server_origin_ref, robot_ref, seq_state });
        bind_sequence_editor({ server_origin_ref, seq_state });
      }
    // } else if (tab_name === "queue") {
    //   tab_content.replaceChildren(render_queue_manager());
    //   // Hide sequence editor
    //   const seq_list = document.getElementById("seq-list");
    //   if (seq_list) {
    //     const seq_editor = seq_list.closest(".card");
    //     if (seq_editor) {
    //       seq_editor.style.display = "none";
    //     }
    //   }
    //   // Initialize queue manager state (only once)
    //   if (!queue_state_ref) {
    //     queue_state_ref = create_ref({ queues: load_queues(), expanded_queue_id: null });
    //     execution_mode_ref = create_ref(load_execution_mode());
    //   }
    //   // IMPORTANT: the queue tab UI is re-rendered on every tab switch,
    //   // so we must re-bind handlers each time (otherwise buttons require refresh).
    //   queue_handlers = bind_queue_manager({
    //     queue_state: queue_state_ref,
    //     execution_mode_ref,
    //     server_origin_ref,
    //     on_state_change: () => {
    //       render_queue_manager_into_dom({ queue_state: queue_state_ref, handlers: queue_handlers });
    //     },
    //   });
    //   render_queue_manager_into_dom({ queue_state: queue_state_ref, handlers: queue_handlers });

    //   // Set initial execution mode
    //   const radio_series = document.getElementById("radio-series");
    //   const radio_parallel = document.getElementById("radio-parallel");
    //   if (radio_series && radio_parallel) {
    //     if (execution_mode_ref.get() === EXECUTION_MODES.SERIES) {
    //       radio_series.checked = true;
    //     } else {
    //       radio_parallel.checked = true;
    //     }
    //   }
    //   const execute_btn_text = document.getElementById("execute-btn-text");
    //   if (execute_btn_text) execute_btn_text.textContent = `Execute All Queues (${execution_mode_ref.get()})`;
    } else if (tab_name === "script") {
      // Only show script tab for WOWE
      const robot_type = robot_type_ref.get();
      if (robot_type === ROBOT_TYPES.WOWE) {
        tab_content.replaceChildren(render_script_manager());
        // Hide sequence editor
        const seq_list = document.getElementById("seq-list");
        if (seq_list) {
          const seq_editor = seq_list.closest(".card");
          if (seq_editor) {
            seq_editor.style.display = "none";
          }
        }
        // UI is re-rendered on each tab switch, so bind each time
        bind_script_manager({ server_origin_ref });
      }
    } else if (tab_name === "ai-mode") {
      tab_content.replaceChildren(render_ai_mode_card());
      // Hide sequence editor
      const seq_list = document.getElementById("seq-list");
      if (seq_list) {
        const seq_editor = seq_list.closest(".card");
        if (seq_editor) {
          seq_editor.style.display = "none";
        }
      }
      // Bind AI mode handlers
      bind_ai_mode_panel({ server_origin_ref, robot_ref });
    }
  };

  const render_settings_view = () => {
    if (!settings_view) return;
    settings_view.replaceChildren(el({ tag: "div", class_name: "settings__grid" }));
    const grid = settings_view.querySelector(".settings__grid");
    if (!grid) return;
    grid.append(render_config_card(), render_robot_management_panel(), render_settings_overview_panel());
    bind_config_panel();
  };

  const switch_main_view = (view_name) => {
    if (!dashboard_layout || !settings_view || !nav_dashboard || !nav_settings) return;
    const is_settings = view_name === "settings";
    dashboard_layout.style.display = is_settings ? "none" : "";
    settings_view.classList.toggle("settings-view--hidden", !is_settings);
    if (bottombar) bottombar.classList.toggle("bottombar--hidden", is_settings);
    if (app_shell) app_shell.classList.toggle("c2--settings", is_settings);
    nav_dashboard.classList.toggle("sidebar__item--active", !is_settings);
    nav_settings.classList.toggle("sidebar__item--active", is_settings);
    if (is_settings) render_settings_view();
  };

  // Initialize Claude API utility (available globally + in window)
  window.claude_api = claude;
  console.log(
    `Claude API initialized. ${
      claude.is_configured()
        ? "✓ API key configured"
        : "⚠ No API key set (configure in Settings)"
    }`
  );

  // Initial render based on robot type
  switch_right_tab("control");
  switch_main_view("dashboard");

  if (nav_dashboard && nav_settings) {
    nav_dashboard.addEventListener("click", () => switch_main_view("dashboard"));
    nav_settings.addEventListener("click", () => switch_main_view("settings"));
  }

  // Bind tabs in control panel (after a short delay to ensure DOM is ready)
  setTimeout(() => {
    const control_tabs = qsa({ selector: ".tabs--horizontal .tab" });
    control_tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tab_name = tab.getAttribute("data-tab");
        const robot_type = robot_type_ref.get();

        // Hide script tab if MEBO is selected
        if (robot_type === ROBOT_TYPES.MEBO && tab_name === "script") {
          return; // Don't allow script tab for MEBO
        }

        control_tabs.forEach((t) => t.classList.remove("tab--active"));
        tab.classList.add("tab--active");
        switch_right_tab(tab_name);
      });
    });
  }, 0);

  render_sequence_into_dom({ seq_state });

  // Initial bindings are handled by switch_right_tab("control")
  // which checks robot type and binds accordingly

  const conn_pill = qs({ selector: "#conn-pill" });
  if (conn_pill) set_conn_pill({ element: conn_pill, is_online: false, text: "CONNECTING…" });

  const start_loops = () => {
    // MJPEG handles continuous video; we only need health polling.
    const health_ms = 1500;

    for (const feed of FEEDS) start_mjpeg_stream({ feed_id: feed.id, server_origin: server_origin_ref.get() });

    setInterval(async () => {
      if (!conn_pill) return;
      const health = await check_health({ server_origin: server_origin_ref.get() });
      set_conn_pill({ element: conn_pill, is_online: health.is_ok, text: health.is_ok ? "ONLINE" : "OFFLINE" });
    }, health_ms);
  };

  start_loops();
};

