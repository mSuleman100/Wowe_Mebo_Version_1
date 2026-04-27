/*
 ==============================================================================
  WOWE Tactical C2 - Control Panel Component (src/components/control_panel.js)

  Author:   M. Suleman Anwar
  Date:     2026-01-15

  Purpose:
  - Renders the right-side "CONTROL PANEL" card:
      - Backend URL input (server origin)
      - D-pad movement buttons
      - Arm sliders (UI placeholder for future servo/arm control)
      - Action buttons (PICK UP / THROW / etc.)

  Notes:
  - This file only renders DOM.
  - Event handlers + API calls are wired in src/app/bootstrap.js.
 ==============================================================================
*/

import { ACTIONS, ROBOTS } from "../app/constants.js";
import { el } from "../utils/dom.js";

/**
 * ==============================================================================
 *  render_card()
 *
 *  Purpose:
 *  - Small helper to render a "panel card" with header + body
 * ==============================================================================
 */
const render_card = ({ title, subtitle, body, footer }) => {
  // Generic "card" wrapper used for right-side panels.
  const card = el({ tag: "section", class_name: "card" });

  const header = el({ tag: "header", class_name: "card__header" });
  header.append(
    el({ tag: "div", class_name: "card__title", text: title }),
    subtitle ? el({ tag: "div", class_name: "card__subtitle", text: subtitle }) : el({ tag: "div", class_name: "card__subtitle", text: "" })
  );

  const content = el({ tag: "div", class_name: "card__body" });
  content.append(body);

  card.append(header, content);
  if (footer) card.append(footer);
  return card;
};

/**
 * ==============================================================================
 *  render_server_settings()
 *
 *  Purpose:
 *  - Render Backend URL input and SAVE button
 *  - Wiring/persistence is handled in bootstrap.js
 * ==============================================================================
 */
const render_server_settings = () => {
  // Backend URL editor (localStorage is handled by bootstrap.js).
  const wrap = el({ tag: "div", class_name: "server" });
  wrap.append(
    el({ tag: "label", class_name: "label", attrs: { for: "server-origin" }, text: "Backend URL" }),
    el({
      tag: "input",
      class_name: "input",
      attrs: { id: "server-origin", placeholder: "http://localhost:8000", autocomplete: "off" },
    }),
    el({
      tag: "button",
      class_name: "btn btn--primary",
      attrs: { id: "save-server-origin", type: "button" },
      text: "SAVE",
    })
  );
  return wrap;
};

/**
 * ==============================================================================
 *  render_dpad()
 *
 *  Purpose:
 *  - Render the movement controls (UP/DOWN/LEFT/RIGHT/STOP)
 * ==============================================================================
 */
const render_dpad = () => {
  // D-pad layout (UP/LEFT/STOP/RIGHT/DOWN).
  const dpad = el({ tag: "div", class_name: "dpad" });

  const up = el({ tag: "button", class_name: "btn btn--nav", attrs: { id: "btn-up", type: "button" }, text: "UP" });
  const down = el({ tag: "button", class_name: "btn btn--nav", attrs: { id: "btn-down", type: "button" }, text: "DOWN" });
  const left = el({ tag: "button", class_name: "btn btn--nav", attrs: { id: "btn-left", type: "button" }, text: "LEFT" });
  const right = el({ tag: "button", class_name: "btn btn--nav", attrs: { id: "btn-right", type: "button" }, text: "RIGHT" });
  const stop = el({ tag: "button", class_name: "btn btn--danger", attrs: { id: "btn-stop", type: "button" }, text: "STOP" });

  dpad.append(
    el({ tag: "div", class_name: "dpad__row" }),
    el({ tag: "div", class_name: "dpad__row" }),
    el({ tag: "div", class_name: "dpad__row" })
  );
  dpad.children[0].append(el({ tag: "div" }), up, el({ tag: "div" }));
  dpad.children[1].append(left, stop, right);
  dpad.children[2].append(el({ tag: "div" }), down, el({ tag: "div" }));

  return dpad;
};

/**
 * ==============================================================================
 *  render_sliders()
 *
 *  Purpose:
 *  - Render LEFT ARM / RIGHT ARM sliders (UI placeholder)
 * ==============================================================================
 */
const render_sliders = () => {
  // Arm sliders (currently UI-only; can be wired to /cmd or a dedicated endpoint later).
  const sliders = el({ tag: "div", class_name: "sliders" });

  const left = el({ tag: "div", class_name: "slider" });
  left.append(
    el({ tag: "div", class_name: "slider__label", text: "LEFT ARM" }),
    el({ tag: "input", class_name: "slider__input", attrs: { id: "slider-left", type: "range", min: "0", max: "100", value: "50" } })
  );

  const right = el({ tag: "div", class_name: "slider" });
  right.append(
    el({ tag: "div", class_name: "slider__label", text: "RIGHT ARM" }),
    el({ tag: "input", class_name: "slider__input", attrs: { id: "slider-right", type: "range", min: "0", max: "100", value: "50" } })
  );

  sliders.append(left, right);
  return sliders;
};

/**
 * ==============================================================================
 *  render_actions()
 *
 *  Purpose:
 *  - Render action buttons from ACTIONS (pick_up/throw/...)
 * ==============================================================================
 */
const render_actions = () => {
  // Action buttons are driven from ACTIONS in src/app/constants.js.
  const grid = el({ tag: "div", class_name: "actions" });
  for (const action of ACTIONS) {
    grid.append(
      el({
        tag: "button",
        class_name: "btn btn--ghost",
        attrs: { type: "button", "data-action-cmd": action.cmd },
        text: action.label,
      })
    );
  }
  return grid;
};

/**
 * ==============================================================================
 *  render_control_panel_content()
 *
 *  Purpose:
 *  - Renders just the control panel card content (used for tab switching)
 * ==============================================================================
 */
/**
 * ==============================================================================
 *  render_robot_selector()
 *
 *  Purpose:
 *  - Render robot selection dropdown (Alpha, Bravo, Charlie, Delta)
 * ==============================================================================
 */
const render_robot_selector = () => {
  const wrap = el({ tag: "div", class_name: "robot-selector" });
  const select = el({
    tag: "select",
    class_name: "input",
    attrs: { id: "robot-select" },
  });

  // Add options to select
  for (const robot of ROBOTS) {
    const option = el({
      tag: "option",
      attrs: { value: robot.id },
      text: robot.label,
    });
    select.append(option);
  }

  wrap.append(
    el({ tag: "label", class_name: "label", attrs: { for: "robot-select" }, text: "ROBOT" }),
    select
  );
  return wrap;
};

/**
 * ==============================================================================
 *  render_robot_type_selector()
 *
 *  Purpose:
 *  - Render WOWE/MEBO selector buttons (for WOWE panel)
 * ==============================================================================
 */
const render_robot_type_selector = () => {
  const wrap = el({ tag: "div", class_name: "robot-type-selector" });
  const buttons = el({ tag: "div", class_name: "selector-buttons" });

  const woweBtn = el({
    tag: "button",
    class_name: "type-btn active",
    attrs: { id: "robot-type-wowe", type: "button", "data-robot-type": "wowe" },
    text: "WOWE",
  });

  const meboBtn = el({
    tag: "button",
    class_name: "type-btn",
    attrs: { id: "robot-type-mebo", type: "button", "data-robot-type": "mebo" },
    text: "MEBO",
  });

  buttons.append(woweBtn, meboBtn);

  wrap.append(
    el({ tag: "label", class_name: "label", text: "ROBOT TYPE" }),
    buttons
  );
  return wrap;
};

export const render_control_panel_content = () => {
  // Render control panel card with header and body
  // WOWE rendering - NO CHANGES to functionality
  const wrap = el({ tag: "div", class_name: "control" });
  wrap.append(
    render_server_settings(),
    el({ tag: "div", class_name: "divider" }),
    render_robot_type_selector(), // Add robot type selector
    el({ tag: "div", class_name: "divider" }),
    render_robot_selector(),
    el({ tag: "div", class_name: "divider" }),
    render_dpad(),
    render_sliders(),
    el({ tag: "div", class_name: "divider" }),
    render_actions()
  );

  // Wrap in card with header
  return render_card({
    title: "CONTROL PANEL",
    subtitle: "[ALPHA]", // Will be updated dynamically by bootstrap.js
    body: wrap,
  });
};

/**
 * ==============================================================================
 *  render_control_panel()
 *
 *  Purpose:
 *  - Exported component used by bootstrap.js
 *  - Includes tab navigation for Control Panel and Queue Manager
 * ==============================================================================
 */
export const render_control_panel = () => {
  const container = el({ tag: "div", class_name: "control-panel-container" });

  // Tab navigation (horizontal)
  const tabs = el({ tag: "nav", class_name: "tabs tabs--horizontal" });
  tabs.append(
    el({
      tag: "button",
      class_name: "tab tab--active",
      attrs: { id: "tab-control", type: "button", "data-tab": "control" },
      text: "CONTROL PANEL",
    }),
    // el({
    //   tag: "button",
    //   class_name: "tab",
    //   attrs: { id: "tab-queue", type: "button", "data-tab": "queue" },
    //   text: "QUEUE",
    // }),
    el({
      tag: "button",
      class_name: "tab",
      attrs: { id: "tab-script", type: "button", "data-tab": "script" },
      text: "SCRIPT",
    }),
    el({
      tag: "button",
      class_name: "tab",
      attrs: { id: "tab-ai-mode", type: "button", "data-tab": "ai-mode" },
      text: "AI MODE",
    })
  );

  // Tab content area
  const tab_content = el({ tag: "div", class_name: "tab-content", attrs: { id: "tab-content" } });
  tab_content.append(render_control_panel_content());

  container.append(tabs, tab_content);
  return container;
};

