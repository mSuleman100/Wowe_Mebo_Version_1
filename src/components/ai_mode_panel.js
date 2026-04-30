/*
 ==============================================================================
  WOWE Tactical C2 - AI Mode Panel Component (src/components/ai_mode_panel.js)

  Author:   M. Suleman Anwar
  Date:     2026-04-27

  Purpose:
  - Renders the AI MODE tab for autonomous robot control
  - Allows selection of target robot (WOWE or MEBO)
  - Accepts custom system prompt for AI behavior
  - Manages AI mode activation/deactivation
  - Runs autonomous AI loop in background

  Notes:
  - AI mode runs concurrently with manual/script control
  - Does not interfere with other robots
  - Uses Claude API for decision making
 ==============================================================================
*/

import { ROBOTS } from "../app/constants.js";
import { el } from "../utils/dom.js";
import { render_ai_logs_panel } from "./ai_logs_panel.js";

/**
 * ==============================================================================
 *  load_ai_mode_config()
 *
 *  Purpose:
 *  - Load AI mode configuration from localStorage
 * ==============================================================================
 */
export const load_ai_mode_config = () => {
  const stored = localStorage.getItem("ai_mode_config");
  if (!stored) {
    return {
      robot_type: "wowe",
      robot_id: ROBOTS[0]?.id || "alpha",
      system_prompt: "",
      is_active: false,
      loop_interval_seconds: 0.5,
    };
  }
  return JSON.parse(stored);
};

/**
 * ==============================================================================
 *  save_ai_mode_config()
 *
 *  Purpose:
 *  - Persist AI mode configuration to localStorage
 * ==============================================================================
 */
export const save_ai_mode_config = (config) => {
  localStorage.setItem("ai_mode_config", JSON.stringify(config));
};

/**
 * ==============================================================================
 *  render_ai_mode_panel_content()
 *
 *  Purpose:
 *  - Render the AI mode configuration form
 * ==============================================================================
 */
export const render_ai_mode_panel_content = () => {
  const config = load_ai_mode_config();

  const wrap = el({ tag: "div", class_name: "ai-mode" });

  // Robot Type Selection (WOWE / MEBO)
  const type_section = el({ tag: "div", class_name: "ai-mode__type-selector" });
  const type_label = el({
    tag: "label",
    class_name: "label",
    text: "ROBOT TYPE",
  });

  const buttons_container = el({ tag: "div", class_name: "selector-buttons" });

  const woweBtn = el({
    tag: "button",
    class_name: `ai-mode__type-btn ${config.robot_type === "wowe" ? "active" : ""}`,
    attrs: { id: "ai-type-wowe", type: "button", "data-robot-type": "wowe" },
    text: "WOWE",
  });

  const meboBtn = el({
    tag: "button",
    class_name: `ai-mode__type-btn ${config.robot_type === "mebo" ? "active" : ""}`,
    attrs: { id: "ai-type-mebo", type: "button", "data-robot-type": "mebo" },
    text: "MEBO",
  });

  buttons_container.append(woweBtn, meboBtn);
  type_section.append(type_label, buttons_container);

  // Robot Selection
  const robot_section = el({ tag: "div", class_name: "ai-mode__section" });
  const robot_select = el({
    tag: "select",
    class_name: "input",
    attrs: { id: "ai-robot-select" },
  });

  for (const robot of ROBOTS) {
    const option = el({
      tag: "option",
      attrs: { value: robot.id },
      text: robot.label,
    });
    robot_select.append(option);
  }
  robot_select.value = config.robot_id;

  robot_section.append(
    el({
      tag: "label",
      class_name: "label",
      attrs: { for: "ai-robot-select" },
      text: "TARGET ROBOT",
    }),
    robot_select
  );

  // System Prompt Input
  const prompt_section = el({ tag: "div", class_name: "ai-mode__section" });
  const prompt_textarea = el({
    tag: "textarea",
    class_name: "ai-mode__textarea",
    attrs: {
      id: "ai-system-prompt",
      placeholder: "Describe AI behavior (e.g., 'Navigate to target')",
    },
  });
  prompt_textarea.value = config.system_prompt;

  prompt_section.append(
    el({
      tag: "label",
      class_name: "label",
      attrs: { for: "ai-system-prompt" },
      text: "SYSTEM PROMPT",
    }),
    prompt_textarea
  );

  // Loop Interval
  const interval_section = el({ tag: "div", class_name: "ai-mode__section" });
  const interval_input = el({
    tag: "input",
    class_name: "input",
    attrs: {
      id: "ai-loop-interval",
      type: "number",
      min: "0.5",
      max: "60",
      step: "0.5",
      value: config.loop_interval_seconds,
    },
  });

  interval_section.append(
    el({
      tag: "label",
      class_name: "label",
      attrs: { for: "ai-loop-interval" },
      text: "DECISION INTERVAL (seconds)",
    }),
    el({
      tag: "div",
      class_name: "ai-mode__help-text",
      text: "How often AI makes decisions (0.5-60 seconds). Shorter = better obstacle avoidance & vision feedback. MEBO recommended: 0.5-1 second.",
    }),
    interval_input
  );

  // Control Buttons
  const buttons = el({ tag: "div", class_name: "ai-mode__buttons" });
  buttons.append(
    el({
      tag: "button",
      class_name: "btn btn--primary ai-mode__btn-start",
      attrs: { id: "ai-start-btn", type: "button" },
      text: "START AI",
    }),
    el({
      tag: "button",
      class_name: "btn btn--secondary ai-mode__btn-stop",
      attrs: { id: "ai-stop-btn", type: "button" },
      text: "STOP AI",
    })
  );

  // Status Display
  const status = el({
    tag: "div",
    class_name: "ai-mode__status",
    attrs: { id: "ai-mode-status" },
  });

  wrap.append(type_section, robot_section, prompt_section, interval_section, buttons, status);
  return wrap;
};

/**
 * ==============================================================================
 *  render_direct_prompt_section()
 *
 *  Purpose:
 *  - Render the Direct AI Command section for one-shot prompts
 * ==============================================================================
 */
export const render_direct_prompt_section = () => {
  const wrap = el({ tag: "div", class_name: "ai-mode__direct-section" });

  // Label
  const label = el({
    tag: "label",
    class_name: "label",
    text: "DIRECT AI COMMAND",
  });

  // Prompt textarea
  const prompt_textarea = el({
    tag: "textarea",
    class_name: "ai-mode__textarea",
    attrs: {
      id: "ai-direct-prompt",
      placeholder: "Type a prompt for Claude...",
    },
  });

  // Send button
  const send_btn = el({
    tag: "button",
    class_name: "btn btn--primary ai-mode__btn-send",
    attrs: { id: "ai-direct-send", type: "button" },
    text: "SEND TO AI",
  });

  // Response container
  const response_container = el({
    tag: "div",
    class_name: "ai-mode__info",
    attrs: { id: "ai-direct-response", style: "display: none;" },
  });

  response_container.append(
    el({
      tag: "div",
      class_name: "ai-mode__info-title",
      text: "CLAUDE RESPONSE",
    }),
    el({
      tag: "div",
      class_name: "ai-mode__info-text",
      attrs: { id: "ai-direct-response-text" },
    }),
    el({
      tag: "div",
      class_name: "ai-mode__info-title",
      attrs: { id: "ai-direct-cmd-title", style: "display: none; margin-top: 8px;" },
      text: "DETECTED COMMAND",
    }),
    el({
      tag: "div",
      class_name: "ai-log__command",
      attrs: { id: "ai-direct-detected-cmd", style: "display: none;" },
    })
  );

  // Execute button
  const exec_btn = el({
    tag: "button",
    class_name: "btn btn--secondary",
    attrs: { id: "ai-direct-exec-btn", type: "button", style: "display: none;" },
    text: "EXECUTE COMMAND",
  });

  wrap.append(
    label,
    prompt_textarea,
    send_btn,
    response_container,
    exec_btn
  );
  return wrap;
};

/**
 * ==============================================================================
 *  render_ai_mode_card()
 *
 *  Purpose:
 *  - Render AI mode panel with card styling (controls + logs)
 * ==============================================================================
 */
export const render_ai_mode_card = () => {
  const card = el({ tag: "section", class_name: "card" });

  const header = el({ tag: "header", class_name: "card__header" });
  header.append(
    el({ tag: "div", class_name: "card__title", text: "AI MODE" }),
    el({
      tag: "div",
      class_name: "card__subtitle",
      text: "AUTONOMOUS",
    })
  );

  const content = el({ tag: "div", class_name: "card__body ai-mode-container" });

  // Control panel section
  const controls_section = el({ tag: "div", class_name: "ai-mode-controls" });
  controls_section.append(render_ai_mode_panel_content());

  // Divider 1
  const divider1 = el({ tag: "div", class_name: "divider" });

  // Direct prompt section
  const direct_section = el({ tag: "div", class_name: "ai-mode-direct" });
  direct_section.append(render_direct_prompt_section());

  // Divider 2
  const divider2 = el({ tag: "div", class_name: "divider" });

  // Logs section
  const logs_section = el({ tag: "div", class_name: "ai-mode-logs" });
  logs_section.append(render_ai_logs_panel());

  content.append(controls_section, divider1, direct_section, divider2, logs_section);
  card.append(header, content);
  return card;
};
