/*
 ==============================================================================
  WOWE Tactical C2 - Script Manager Component (src/components/script_manager.js)

  Purpose:
  - UI shell for the "Robot Command Script" feature:
    - Script editor (nested Series/Parallel groups + robot queues)
    - Validate / Simulate buttons (UI-first; engine comes later)
    - Validation output
    - AST preview (placeholder)
    - Timeline preview (placeholder)
    - Event log (placeholder)
 ==============================================================================
*/

import { el } from "../utils/dom.js";

export const SCRIPT_STORAGE_KEY = "wowe.script_text";

export const DEFAULT_SCRIPT = `{
  "Parallel": [
    { "alpha": ["Left", "Left", "Right", "Stop"] },
    { "bravo": ["Left", "Left", "Right", "Stop"] }
  ]
}`;

export const load_script_text = () => {
  try {
    const raw = localStorage.getItem(SCRIPT_STORAGE_KEY);
    return raw && String(raw).trim().length > 0 ? String(raw) : DEFAULT_SCRIPT;
  } catch {
    return DEFAULT_SCRIPT;
  }
};

export const save_script_text = ({ script_text }) => {
  localStorage.setItem(SCRIPT_STORAGE_KEY, String(script_text ?? ""));
};

const render_kv = ({ label, value, tone = "ok" }) => {
  const row = el({ tag: "div", class_name: `script-kv script-kv--${tone}` });
  row.append(
    el({ tag: "div", class_name: "script-kv__label", text: label }),
    el({ tag: "div", class_name: "script-kv__value", text: value })
  );
  return row;
};

const render_lane = ({ robot_label }) => {
  const lane = el({ tag: "div", class_name: "script-lane" });
  lane.append(
    el({ tag: "div", class_name: "script-lane__label", text: robot_label }),
    el({ tag: "div", class_name: "script-lane__track" })
  );
  return lane;
};

export const render_script_manager = () => {
  const root = el({ tag: "section", class_name: "card card--script" });

  const header = el({ tag: "header", class_name: "card__header" });
  header.append(
    el({ tag: "div", class_name: "card__title", text: "SCRIPT EXECUTION" }),
    el({ tag: "div", class_name: "card__subtitle", text: "JSON: { Parallel:[...]} / { Series:[...]} • Verbose Logs" })
  );

  const body = el({ tag: "div", class_name: "card__body script" });

  // Editor section
  const editor = el({ tag: "section", class_name: "script__editor" });
  const editor_head = el({ tag: "div", class_name: "script__editor-head" });
  const editor_actions = el({ tag: "div", class_name: "script__editor-actions" });
  editor_actions.append(
    el({
      tag: "button",
      class_name: "btn btn--primary btn--xs",
      attrs: { id: "script-validate-btn", type: "button" },
      text: "VALIDATE",
    }),
    el({
      tag: "button",
      class_name: "btn btn--script-run btn--xs",
      attrs: { id: "script-run-btn", type: "button" },
      text: "RUN SIMULATION",
    }),
    el({
      tag: "button",
      class_name: "btn btn--danger btn--xs",
      attrs: { id: "script-abort-btn", type: "button" },
      text: "ABORT RUN",
    })
  );
  editor_head.append(el({ tag: "div", class_name: "script__section-title", text: "SCRIPT" }), editor_actions);

  const textarea = el({
    tag: "textarea",
    class_name: "input script__textarea",
    attrs: { id: "script-textarea", spellcheck: "false", autocomplete: "off" },
    text: load_script_text(),
  });

  editor.append(editor_head, textarea);

  // Status section
  const status = el({ tag: "section", class_name: "script__status", attrs: { id: "script-status" } });
  status.append(
    el({ tag: "div", class_name: "script__section-title", text: "VALIDATION" }),
    render_kv({ label: "Status", value: "Idle (UI only)", tone: "muted" }),
    render_kv({ label: "AST", value: "Not generated yet", tone: "muted" }),
    render_kv({ label: "Duration", value: "—", tone: "muted" })
  );

  // Lower panels: AST + Timeline
  const lower = el({ tag: "section", class_name: "script__lower" });

  const ast = el({ tag: "div", class_name: "script__panel" });
  ast.append(
    el({ tag: "div", class_name: "script__section-title", text: "AST" }),
    el({
      tag: "pre",
      class_name: "script__pre",
      attrs: { id: "script-ast" },
      text: "Parallel\n  Ralpha queue\n  Series\n    Rbravo queue\n    Parallel\n      Rcharlie queue\n      Rdelta queue\n    Rbravo queue",
    })
  );

  const timeline = el({ tag: "div", class_name: "script__panel" });
  timeline.append(
    el({ tag: "div", class_name: "script__section-title", text: "TIMELINE" }),
    el({ tag: "div", class_name: "script__timeline", attrs: { id: "script-timeline" } })
  );

  // Lanes (placeholder)
  const lanes = timeline.querySelector("#script-timeline");
  lanes.append(
    render_lane({ robot_label: "ALPHA" }),
    render_lane({ robot_label: "BRAVO" }),
    render_lane({ robot_label: "CHARLIE" }),
    render_lane({ robot_label: "DELTA" })
  );

  lower.append(ast, timeline);

  // Event log
  const log = el({ tag: "section", class_name: "script__log" });
  log.append(
    el({ tag: "div", class_name: "script__section-title", text: "EVENT LOG" }),
    el({
      tag: "div",
      class_name: "script__log-body",
      attrs: { id: "script-log" },
      text: "—",
    })
  );

  body.append(editor, status, lower, log);
  root.append(header, body);
  return root;
};

