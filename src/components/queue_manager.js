/*
 ==============================================================================
  WOWE Tactical C2 - Queue Manager Component (src/components/queue_manager.js)

  Author:   M. Suleman Anwar
  Date:     2026-01-15

  Purpose:
  - Renders the Queue Manager interface:
      - Queue creation (name input + robot selection)
      - Queue list with expandable steps
      - Execution mode selection (Series/Parallel)
      - Execute all queues button

  Notes:
  - Queue data is stored in localStorage.
  - Steps can be commands from COMMANDS or ACTIONS.
 ==============================================================================
*/

import { COMMANDS, ACTIONS, ROBOTS, EXECUTION_MODES } from "../app/constants.js";
import { el } from "../utils/dom.js";

export const QUEUE_STORAGE_KEY = "wowe.queues";
export const EXECUTION_MODE_STORAGE_KEY = "wowe.execution_mode";

/**
 * ==============================================================================
 *  load_queues()
 *
 *  Purpose:
 *  - Load queues array from localStorage (safe parsing)
 * ==============================================================================
 */
export const load_queues = () => {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((q) => q && typeof q.id === "string" && typeof q.name === "string" && typeof q.robot_id === "string");
  } catch {
    return [];
  }
};

/**
 * ==============================================================================
 *  save_queues()
 *
 *  Purpose:
 *  - Persist queues array to localStorage
 * ==============================================================================
 */
export const save_queues = ({ queues }) => {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queues));
};

/**
 * ==============================================================================
 *  load_execution_mode()
 *
 *  Purpose:
 *  - Load execution mode from localStorage (default: series)
 * ==============================================================================
 */
export const load_execution_mode = () => {
  try {
    const raw = localStorage.getItem(EXECUTION_MODE_STORAGE_KEY);
    return raw === EXECUTION_MODES.PARALLEL ? EXECUTION_MODES.PARALLEL : EXECUTION_MODES.SERIES;
  } catch {
    return EXECUTION_MODES.SERIES;
  }
};

/**
 * ==============================================================================
 *  save_execution_mode()
 *
 *  Purpose:
 *  - Persist execution mode to localStorage
 * ==============================================================================
 */
export const save_execution_mode = ({ mode }) => {
  localStorage.setItem(EXECUTION_MODE_STORAGE_KEY, mode);
};

/**
 * ==============================================================================
 *  get_all_commands()
 *
 *  Purpose:
 *  - Get all available commands (movement + actions) for step selection
 * ==============================================================================
 */
const get_all_commands = () => {
  const movement = Object.values(COMMANDS).map((cmd) => ({ type: "movement", cmd, label: cmd.toUpperCase() }));
  const actions = ACTIONS.map((action) => ({ type: "action", cmd: action.cmd, label: action.label }));
  return [...movement, ...actions];
};

/**
 * ==============================================================================
 *  render_queue_card()
 *
 *  Purpose:
 *  - Render a single queue card with name, step count, and edit/delete buttons
 * ==============================================================================
 */
const render_queue_card = ({ queue, is_expanded, on_toggle_expand, on_delete, on_add_step, on_remove_step }) => {
  const card = el({ tag: "div", class_name: "queue-card", attrs: { "data-queue-id": queue.id } });
  if (is_expanded) card.classList.add("queue-card--expanded");

  const header = el({ tag: "div", class_name: "queue-card__header" });
  header.append(
    el({ tag: "div", class_name: "queue-card__name", text: queue.name }),
    el({ tag: "div", class_name: "queue-card__meta", text: `${queue.steps?.length || 0} steps` }),
    el({ tag: "div", class_name: "queue-card__actions" })
  );

  const edit_btn = el({
    tag: "button",
    class_name: "queue-card__action-btn",
    attrs: { type: "button", "data-queue-edit": queue.id, title: "Edit queue" },
    text: "✎",
  });

  const delete_btn = el({
    tag: "button",
    class_name: "queue-card__action-btn",
    attrs: { type: "button", "data-queue-delete": queue.id, title: "Delete queue" },
    text: "🗑",
  });

  if (queue.steps && queue.steps.length > 0) {
    edit_btn.classList.add("queue-card__action-btn--active");
    delete_btn.classList.add("queue-card__action-btn--active");
  }

  header.querySelector(".queue-card__actions").append(edit_btn, delete_btn);

  const body = el({ tag: "div", class_name: "queue-card__body" });
  if (is_expanded) {
    const steps_list = el({ tag: "div", class_name: "queue-card__steps" });
    if (queue.steps && queue.steps.length > 0) {
      queue.steps.forEach((step, idx) => {
        const step_row = el({ tag: "div", class_name: "queue-card__step" });
        const step_num = el({ tag: "span", class_name: "queue-card__step-num", text: `${idx + 1}.` });
        const queue_robot = queue.robot_id || ROBOTS[0].id;
        const step_badge_text = ROBOTS.find((r) => r.id === queue_robot)?.label || "UNKNOWN";
        const step_badge = el({ tag: "span", class_name: "queue-card__step-badge", text: step_badge_text });
        const step_cmd = el({ tag: "span", class_name: "queue-card__step-cmd", text: step.cmd || step });
        const step_remove = el({
          tag: "button",
          class_name: "queue-card__step-remove",
          attrs: { type: "button", "data-step-remove": `${queue.id}:${idx}`, title: "Remove step" },
          text: "✕",
        });
        step_row.append(step_num, step_badge, step_cmd, step_remove);
        steps_list.append(step_row);
      });
    }

    const add_step_section = el({ tag: "div", class_name: "queue-card__add-step" });
    const add_step_label = el({ tag: "div", class_name: "queue-card__add-step-label", text: "ADD COMMAND" });

    const step_input = el({
      tag: "input",
      class_name: "input input--sm",
      attrs: { type: "text", placeholder: "e.g., up, down, left, right", "data-queue-add-input": queue.id },
    });
    const step_add_btn = el({
      tag: "button",
      class_name: "btn btn--primary btn--xs",
      attrs: { type: "button", "data-queue-add": queue.id },
      text: "Add",
    });
    add_step_section.append(add_step_label, step_input, step_add_btn);
    body.append(steps_list, add_step_section);
  }

  card.append(header, body);

  // Bind toggle on edit button click
  edit_btn.addEventListener("click", () => {
    on_toggle_expand(queue.id);
  });

  delete_btn.addEventListener("click", () => {
    on_delete(queue.id);
  });

  if (on_add_step) {
    const add_input = body.querySelector(`[data-queue-add-input="${queue.id}"]`);
    const add_btn = body.querySelector(`[data-queue-add="${queue.id}"]`);
    if (add_input && add_btn) {
      const handle_add = () => {
        const cmd = String(add_input.value ?? "").trim();
        if (cmd) {
          on_add_step(queue.id, { cmd });
          add_input.value = "";
        }
      };
      add_btn.addEventListener("click", handle_add);
      add_input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handle_add();
        }
      });
    }
  }

  if (on_remove_step) {
    body.querySelectorAll(`[data-step-remove]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const [queue_id, step_idx] = btn.getAttribute("data-step-remove").split(":");
        on_remove_step(queue_id, Number(step_idx));
      });
    });
  }

  return card;
};

/**
 * ==============================================================================
 *  render_queue_list()
 *
 *  Purpose:
 *  - Render the scrollable queue list
 * ==============================================================================
 */
export const render_queue_list = ({ queues, expanded_queue_id, on_toggle_expand, on_delete, on_add_step, on_remove_step }) => {
  const container = el({ tag: "div", class_name: "queue-list" });
  if (queues.length === 0) {
    container.append(
      el({
        tag: "div",
        class_name: "queue-list__empty",
        text: "No queues yet. Create a queue to get started.",
      })
    );
    return container;
  }

  queues.forEach((queue) => {
    container.append(
      render_queue_card({
        queue,
        is_expanded: expanded_queue_id === queue.id,
        on_toggle_expand,
        on_delete,
        on_add_step,
        on_remove_step,
      })
    );
  });

  return container;
};

/**
 * ==============================================================================
 *  render_queue_manager()
 *
 *  Purpose:
 *  - Render the full Queue Manager card
 * ==============================================================================
 */
export const render_queue_manager = () => {
  const root = el({ tag: "section", class_name: "card card--queue" });

  const header = el({ tag: "header", class_name: "card__header" });
  header.append(el({ tag: "div", class_name: "card__title", text: "QUEUE MANAGER" }));

  const body = el({ tag: "div", class_name: "card__body" });

  // Queue creation section
  const create_section = el({ tag: "div", class_name: "queue-create" });
  const name_input = el({
    tag: "input",
    class_name: "input",
    attrs: { id: "queue-name-input", type: "text", placeholder: "Enter queue name" },
  });
  const robot_select = el({
    tag: "select",
    class_name: "input",
    attrs: { id: "queue-robot-select" },
  });
  ROBOTS.forEach((robot) => {
    robot_select.append(el({ tag: "option", attrs: { value: robot.id }, text: robot.label }));
  });
  const create_btn = el({
    tag: "button",
    class_name: "btn btn--primary",
    attrs: { id: "queue-create-btn", type: "button" },
  });
  const create_icon = el({ tag: "span", text: "+" });
  create_btn.append(create_icon, el({ tag: "span", text: "CREATE QUEUE" }));
  create_section.append(name_input, robot_select, create_btn);

  // Queue list section
  const list_section = el({ tag: "div", class_name: "queue-list-section", attrs: { id: "queue-list-container" } });

  // Execution mode section
  const exec_section = el({ tag: "div", class_name: "queue-exec" });
  exec_section.append(el({ tag: "div", class_name: "queue-exec__title", text: "EXECUTION MODE" }));
  const exec_mode_container = el({ tag: "div", class_name: "queue-exec__modes" });
  const series_radio = el({
    tag: "label",
    class_name: "queue-exec__radio",
    attrs: { id: "exec-mode-series" },
  });
  series_radio.append(
    el({ tag: "input", attrs: { type: "radio", name: "exec-mode", value: EXECUTION_MODES.SERIES, id: "radio-series" } }),
    el({ tag: "span", text: "Series (Sequential)" })
  );
  const parallel_radio = el({
    tag: "label",
    class_name: "queue-exec__radio",
    attrs: { id: "exec-mode-parallel" },
  });
  parallel_radio.append(
    el({ tag: "input", attrs: { type: "radio", name: "exec-mode", value: EXECUTION_MODES.PARALLEL, id: "radio-parallel" } }),
    el({ tag: "span", text: "Parallel (Simultaneous)" })
  );
  exec_mode_container.append(series_radio, parallel_radio);

  const execute_btn = el({
    tag: "button",
    class_name: "btn btn--execute",
    attrs: { id: "queue-execute-btn", type: "button" },
  });
  const execute_icon = el({ tag: "span", text: "▶" });
  execute_btn.append(execute_icon, el({ tag: "span", attrs: { id: "execute-btn-text" }, text: "Execute All Queues (series)" }));

  exec_section.append(exec_mode_container, execute_btn);

  body.append(create_section, list_section, exec_section);
  root.append(header, body);

  return root;
};
