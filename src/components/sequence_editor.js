/*
 ==============================================================================
  WOWE Tactical C2 - Sequence Editor (src/components/sequence_editor.js)

  Author:   M. Suleman Anwar
  Date:     2026-01-15

  Purpose:
  - Provides a simple sequence builder:
      - Add steps manually (text input)
      - Record steps by clicking action buttons (wired in bootstrap.js)
      - Persist steps in localStorage so refresh doesn't lose work

  Notes:
  - Sending sequences to backend happens in src/app/bootstrap.js (POST /sequence).
 ==============================================================================
*/

import { el } from "../utils/dom.js";

export const SEQUENCE_STORAGE_KEY = "wowe.sequence_steps";

/**
 * ==============================================================================
 *  load_sequence_steps()
 *
 *  Purpose:
 *  - Load steps array from localStorage (safe parsing)
 * ==============================================================================
 */
export const load_sequence_steps = () => {
  // Load an array of steps from localStorage. Returns [] on any invalid data.
  try {
    const raw = localStorage.getItem(SEQUENCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string" && x.trim().length > 0);
  } catch {
    return [];
  }
};

/**
 * ==============================================================================
 *  save_sequence_steps()
 *
 *  Purpose:
 *  - Persist steps array to localStorage
 * ==============================================================================
 */
export const save_sequence_steps = ({ steps }) => {
  // Persist steps to localStorage.
  localStorage.setItem(SEQUENCE_STORAGE_KEY, JSON.stringify(steps));
};

/**
 * ==============================================================================
 *  render_sequence_editor()
 *
 *  Purpose:
 *  - Render the full Sequence Editor card (list + input + footer buttons)
 * ==============================================================================
 */
export const render_sequence_editor = () => {
  // Render the Sequence Editor card (list + input + footer buttons).
  const root = el({ tag: "section", class_name: "card" });

  const header = el({ tag: "header", class_name: "card__header" });
  header.append(
    el({ tag: "div", class_name: "card__title", text: "SEQUENCE EDITOR" }),
    el({ tag: "div", class_name: "card__subtitle", text: "" })
  );

  const body = el({ tag: "div", class_name: "card__body" });
  const list = el({ tag: "div", class_name: "sequence", attrs: { id: "seq-list" } });

  const add_row = el({ tag: "div", class_name: "sequence__add" });
  add_row.append(
    el({
      tag: "input",
      class_name: "input",
      attrs: { id: "seq-input", placeholder: "e.g. walk_fwd_2s, turn_left_1s, roar" },
    }),
    el({
      tag: "button",
      class_name: "btn btn--primary",
      attrs: { id: "seq-add", type: "button" },
      text: "ADD",
    })
  );

  const footer = el({ tag: "footer", class_name: "sequence__footer" });
  footer.append(
    el({ tag: "button", class_name: "btn btn--danger", attrs: { id: "seq-rec", type: "button" }, text: "REC" }),
    el({ tag: "button", class_name: "btn btn--primary", attrs: { id: "seq-play", type: "button" }, text: "PLAY SELECTED" }),
    el({ tag: "button", class_name: "btn btn--ghost", attrs: { id: "seq-broadcast", type: "button" }, text: "BROADCAST ALL" })
  );

  body.append(list, add_row, footer);
  root.append(header, body);
  return root;
};

/**
 * ==============================================================================
 *  render_sequence_list()
 *
 *  Purpose:
 *  - Render only the list portion (rows + remove buttons)
 * ==============================================================================
 */
export const render_sequence_list = ({ steps }) => {
  // Render only the list area (used for re-rendering after add/remove).
  const fragment = document.createDocumentFragment();

  if (steps.length === 0) {
    fragment.append(
      el({
        tag: "div",
        class_name: "sequence__empty",
        text: "No steps yet. Add steps from actions or type a command string.",
      })
    );
    return fragment;
  }

  steps.forEach((step, idx) => {
    const row = el({ tag: "div", class_name: "sequence__row", attrs: { "data-seq-idx": String(idx) } });
    row.append(
      el({ tag: "div", class_name: "sequence__tag", text: step }),
      el({ tag: "div", class_name: "sequence__spacer" }),
      el({
        tag: "button",
        class_name: "btn btn--ghost btn--xs",
        attrs: { type: "button", "data-seq-remove": String(idx), title: "Remove step" },
        text: "✕",
      })
    );
    fragment.append(row);
  });

  return fragment;
};

