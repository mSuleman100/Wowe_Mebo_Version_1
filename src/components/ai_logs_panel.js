/*
 ==============================================================================
  WOWE Tactical C2 - AI Logs Panel (src/components/ai_logs_panel.js)

  Author:   M. Suleman Anwar
  Date:     2026-04-27

  Purpose:
  - Display real-time AI decision logs
  - Show step-by-step responses from Claude
  - Display robot camera feed
  - Monitor AI activity with timestamps

  Notes:
  - Logs stored in memory (cleared on page reload)
  - Scrollable list of decisions
  - Shows status, command, and decision text
 ==============================================================================
*/

import { el } from "../utils/dom.js";

// In-memory log storage
let ai_logs = [];
const MAX_LOGS = 50; // Keep last 50 decisions

/**
 * ==============================================================================
 *  add_ai_log()
 *
 *  Purpose:
 *  - Add a log entry to the monitoring list
 * ==============================================================================
 */
export const add_ai_log = ({
  robot_id,
  status,
  decision_text,
  command,
  error,
  timestamp,
}) => {
  const log_entry = {
    id: Date.now(),
    robot_id,
    status, // 'decision_made', 'command_executed', 'error', 'started', 'stopped'
    decision_text,
    command,
    error,
    timestamp: timestamp || new Date().toISOString(),
  };

  ai_logs.unshift(log_entry);

  // Keep only recent logs
  if (ai_logs.length > MAX_LOGS) {
    ai_logs = ai_logs.slice(0, MAX_LOGS);
  }

  return log_entry;
};

/**
 * ==============================================================================
 *  get_ai_logs()
 *
 *  Purpose:
 *  - Retrieve all logged entries
 * ==============================================================================
 */
export const get_ai_logs = () => {
  return [...ai_logs];
};

/**
 * ==============================================================================
 *  clear_ai_logs()
 *
 *  Purpose:
 *  - Clear all logs
 * ==============================================================================
 */
export const clear_ai_logs = () => {
  ai_logs = [];
};

/**
 * ==============================================================================
 *  render_log_entry()
 *
 *  Purpose:
 *  - Render a single log entry
 * ==============================================================================
 */
const render_log_entry = (log) => {
  const entry = el({ tag: "div", class_name: "ai-log__entry" });

  // Status badge
  let status_class = "ai-log__status--info";
  let status_icon = "⟳";

  if (log.status === "command_executed") {
    status_class = "ai-log__status--success";
    status_icon = "✓";
  } else if (log.status === "error") {
    status_class = "ai-log__status--error";
    status_icon = "✗";
  } else if (log.status === "started") {
    status_class = "ai-log__status--start";
    status_icon = "▶";
  } else if (log.status === "stopped") {
    status_class = "ai-log__status--stop";
    status_icon = "⊙";
  }

  const header = el({ tag: "div", class_name: "ai-log__header" });
  header.append(
    el({
      tag: "span",
      class_name: `ai-log__status ${status_class}`,
      text: status_icon,
    }),
    el({
      tag: "span",
      class_name: "ai-log__robot",
      text: log.robot_id.toUpperCase(),
    }),
    el({
      tag: "span",
      class_name: "ai-log__time",
      text: new Date(log.timestamp).toLocaleTimeString(),
    })
  );

  entry.append(header);

  // Command/Decision
  if (log.command) {
    entry.append(
      el({
        tag: "div",
        class_name: "ai-log__command",
        text: `→ ${log.command}`,
      })
    );
  }

  // Decision text
  if (log.decision_text) {
    const decision = el({
      tag: "div",
      class_name: "ai-log__decision",
      text: log.decision_text.substring(0, 100),
    });
    if (log.decision_text.length > 100) {
      decision.textContent += "...";
    }
    entry.append(decision);
  }

  // Error
  if (log.error) {
    entry.append(
      el({
        tag: "div",
        class_name: "ai-log__error",
        text: `✗ ${log.error}`,
      })
    );
  }

  return entry;
};

/**
 * ==============================================================================
 *  render_ai_logs_panel()
 *
 *  Purpose:
 *  - Render the logs viewing panel
 * ==============================================================================
 */
export const render_ai_logs_panel = () => {
  const container = el({ tag: "div", class_name: "ai-logs" });

  // Header
  const header = el({ tag: "div", class_name: "ai-logs__header" });
  header.append(
    el({
      tag: "div",
      class_name: "ai-logs__title",
      text: "AI DECISION LOG",
    }),
    el({
      tag: "button",
      class_name: "btn ai-logs__clear-btn",
      attrs: { id: "ai-clear-logs-btn", type: "button" },
      text: "CLEAR",
    })
  );

  // Logs list
  const logs_list = el({ tag: "div", class_name: "ai-logs__list", attrs: { id: "ai-logs-list" } });

  if (ai_logs.length === 0) {
    logs_list.append(
      el({
        tag: "div",
        class_name: "ai-logs__empty",
        text: "No AI activity yet. Start AI mode to see logs.",
      })
    );
  } else {
    for (const log of ai_logs) {
      logs_list.append(render_log_entry(log));
    }
  }

  container.append(header, logs_list);
  return container;
};

/**
 * ==============================================================================
 *  update_ai_logs_display()
 *
 *  Purpose:
 *  - Update the logs list display (called when new log is added)
 * ==============================================================================
 */
export const update_ai_logs_display = () => {
  const logs_list = document.getElementById("ai-logs-list");
  if (!logs_list) return;

  logs_list.replaceChildren();

  if (ai_logs.length === 0) {
    logs_list.append(
      el({
        tag: "div",
        class_name: "ai-logs__empty",
        text: "No AI activity yet. Start AI mode to see logs.",
      })
    );
  } else {
    for (const log of ai_logs) {
      logs_list.append(render_log_entry(log));
    }
  }

  // Auto-scroll to top
  logs_list.scrollTop = 0;
};

/**
 * ==============================================================================
 *  display_backend_logs()
 *
 *  Purpose:
 *  - Display logs fetched from backend API
 * ==============================================================================
 */
export const display_backend_logs = (backend_logs) => {
  const logs_list = document.getElementById("ai-logs-list");
  if (!logs_list) return;

  logs_list.replaceChildren();

  if (!backend_logs || backend_logs.length === 0) {
    logs_list.append(
      el({
        tag: "div",
        class_name: "ai-logs__empty",
        text: "No AI activity yet. Start AI mode to see logs.",
      })
    );
  } else {
    for (const log of backend_logs) {
      logs_list.append(render_log_entry(log));
    }
  }

  // Auto-scroll to top
  logs_list.scrollTop = 0;
};
