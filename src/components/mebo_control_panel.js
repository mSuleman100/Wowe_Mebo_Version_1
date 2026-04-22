/*
 ==============================================================================
  MEBO Robot - Control Panel Component (src/components/mebo_control_panel.js)

  Author:   M. Suleman Anwar
  Date:     2026-01-15

  Purpose:
  - Renders MEBO game controller UI in the control panel
  - Completely separate from WOWE control panel
  - Includes joystick and linear sliders for robot control

  Notes:
  - This file only renders DOM.
  - Event handlers are wired in src/app/bootstrap.js.
 ==============================================================================
*/

import { ROBOTS } from "../app/constants.js";
import { el } from "../utils/dom.js";

/**
 * ==============================================================================
 *  render_card()
 *
 *  Purpose:
 *  - Helper to render a "panel card" with header + body (same as WOWE)
 * ==============================================================================
 */
const render_card = ({ title, subtitle, body, footer }) => {
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
 *  - Render Backend URL input and SAVE button (MEBO style - flex layout)
 * ==============================================================================
 */
const render_server_settings = () => {
  const wrap = el({ tag: "div", class_name: "server" });
  const inputContainer = el({ tag: "div", attrs: { style: "display: flex; gap: 8px;" } });

  const input = el({
    tag: "input",
    class_name: "input",
    attrs: {
      id: "server-origin",
      placeholder: "http://localhost:8000",
      autocomplete: "off",
      style: "flex: 1;"
    },
  });

  const saveBtn = el({
    tag: "button",
    class_name: "btn btn--primary",
    attrs: { id: "save-server-origin", type: "button" },
    text: "SAVE",
  });

  inputContainer.append(input, saveBtn);

  wrap.append(
    el({ tag: "label", class_name: "label", attrs: { for: "server-origin" }, text: "BACKEND URL" }),
    inputContainer
  );
  return wrap;
};

/**
 * ==============================================================================
 *  render_robot_type_selector()
 *
 *  Purpose:
 *  - Render WOWE/MEBO selector buttons
 * ==============================================================================
 */
const render_robot_type_selector = () => {
  const wrap = el({ tag: "div", class_name: "robot-type-selector" });
  const buttons = el({ tag: "div", class_name: "selector-buttons" });

  const woweBtn = el({
    tag: "button",
    class_name: "type-btn",
    attrs: { id: "robot-type-wowe", type: "button", "data-robot-type": "wowe" },
    text: "WOWE",
  });

  const meboBtn = el({
    tag: "button",
    class_name: "type-btn active",
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

/**
 * ==============================================================================
 *  render_robot_selector()
 *
 *  Purpose:
 *  - Render robot selection dropdown (MEBO style with inline margin)
 * ==============================================================================
 */
const render_robot_selector = () => {
  const wrap = el({
    tag: "div",
    attrs: { style: "margin-bottom: 16px;" }
  });
  const select = el({
    tag: "select",
    class_name: "input",
    attrs: { id: "robot-select" },
  });

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
 *  render_movement_joystick()
 *
 *  Purpose:
 *  - Render circular joystick for movement control
 * ==============================================================================
 */
const render_movement_joystick = () => {
  const section = el({ tag: "div", class_name: "joystick-section" });
  const title = el({ tag: "div", class_name: "joystick-title", text: "Movement" });
  const wrapper = el({ tag: "div", class_name: "joystick-wrapper" });

  const container = el({ tag: "div", class_name: "joystick-container" });
  const base = el({ tag: "div", class_name: "joystick-base" });
  const stick = el({
    tag: "div",
    class_name: "joystick-stick",
    attrs: { id: "mebo-joystick" },
  });
  base.append(stick);
  container.append(base);

  const info = el({ tag: "div", class_name: "joystick-info" });
  info.innerHTML = "↑FWD ↓REV<br>←L →R";

  wrapper.append(container, info);
  section.append(title, wrapper);
  return section;
};

/**
 * ==============================================================================
 *  render_claw_slider()
 *
 *  Purpose:
 *  - Render vertical slider for claw gripper (with orange/yellow styling)
 * ==============================================================================
 */
const render_claw_slider = () => {
  const section = el({
    tag: "div",
    class_name: "slider-section mebo-slider-claw",
    attrs: {
      style: "background: rgba(255, 184, 32, 0.1); border-color: rgba(255, 184, 32, 0.3);"
    },
  });
  const title = el({
    tag: "div",
    class_name: "slider-title",
    attrs: { style: "color: #ffb020;" },
    text: "Claw"
  });
  const container = el({ tag: "div", class_name: "slider-container-vertical" });

  const track = el({
    tag: "div",
    class_name: "slider-track-vertical",
    attrs: { id: "mebo-slider-claw-track" },
  });
  const handle = el({
    tag: "div",
    class_name: "slider-handle-vertical mebo-handle-claw",
    attrs: {
      id: "mebo-slider-claw",
      style: "background: linear-gradient(135deg, #ffb020, #ff9500); box-shadow: 0 0 12px rgba(255, 184, 32, 0.5);"
    },
  });
  track.append(handle);

  const labels = el({ tag: "div", class_name: "slider-labels" });
  const openLabel = el({
    tag: "span",
    attrs: { style: "color: rgba(255, 184, 32, 0.8);" },
    text: "↑OPEN"
  });
  const closeLabel = el({
    tag: "span",
    attrs: { style: "color: rgba(255, 184, 32, 0.8);" },
    text: "↓CLOSE"
  });
  labels.append(openLabel, closeLabel);

  container.append(track, labels);
  section.append(title, container);
  return section;
};

/**
 * ==============================================================================
 *  render_rotation_slider()
 *
 *  Purpose:
 *  - Render horizontal slider for rotation (with green styling)
 * ==============================================================================
 */
const render_rotation_slider = () => {
  const section = el({
    tag: "div",
    class_name: "slider-section mebo-slider-rotation",
    attrs: {
      style: "background: rgba(50, 255, 183, 0.1); border-color: rgba(50, 255, 183, 0.3);"
    },
  });
  const title = el({
    tag: "div",
    class_name: "slider-title",
    attrs: { style: "color: #32ffb7;" },
    text: "Rotation"
  });
  const container = el({ tag: "div", class_name: "slider-container-horizontal" });

  const labels = el({ tag: "div", class_name: "slider-labels-horizontal" });
  const ccwLabel = el({
    tag: "span",
    attrs: { style: "color: rgba(50, 255, 183, 0.8);" },
    text: "←CCW"
  });
  const cwLabel = el({
    tag: "span",
    attrs: { style: "color: rgba(50, 255, 183, 0.8);" },
    text: "CW→"
  });
  labels.append(ccwLabel, cwLabel);

  const track = el({
    tag: "div",
    class_name: "slider-track-horizontal",
    attrs: { id: "mebo-slider-rotation-track" },
  });
  const handle = el({
    tag: "div",
    class_name: "slider-handle-horizontal mebo-handle-rotation",
    attrs: {
      id: "mebo-slider-rotation",
      style: "background: linear-gradient(135deg, #32ffb7, #28cc9e); box-shadow: 0 0 12px rgba(50, 255, 183, 0.5);"
    },
  });
  track.append(handle);

  container.append(labels, track);
  section.append(title, container);
  return section;
};

/**
 * ==============================================================================
 *  render_joint_slider()
 *
 *  Purpose:
 *  - Render vertical slider for joint control
 * ==============================================================================
 */
const render_joint_slider = ({ id, label }) => {
  const section = el({
    tag: "div",
    class_name: "slider-section mebo-slider-joint",
  });
  const title = el({ tag: "div", class_name: "slider-title", text: label });
  const container = el({ tag: "div", class_name: "slider-container-vertical" });

  const track = el({
    tag: "div",
    class_name: "slider-track-vertical",
    attrs: { id: `mebo-slider-${id}-track` },
  });
  const handle = el({
    tag: "div",
    class_name: "slider-handle-vertical mebo-handle-joint",
    attrs: { id: `mebo-slider-${id}` },
  });
  track.append(handle);

  const labels = el({ tag: "div", class_name: "slider-labels" });
  const upLabel = el({ tag: "span", text: "↑UP" });
  const downLabel = el({ tag: "span", text: "↓DOWN" });
  labels.append(upLabel, downLabel);

  container.append(track, labels);
  section.append(title, container);
  return section;
};

/**
 * ==============================================================================
 *  render_stop_button()
 *
 *  Purpose:
 *  - Render full-width stop button
 * ==============================================================================
 */
const render_stop_button = () => {
  const section = el({ tag: "div", class_name: "stop-section" });
  const button = el({
    tag: "button",
    class_name: "stop-button",
    attrs: { id: "mebo-stop-btn", type: "button" },
    text: "STOP",
  });
  section.append(button);
  return section;
};

/**
 * ==============================================================================
 *  render_mebo_control_panel_content()
 *
 *  Purpose:
 *  - Renders MEBO game controller UI
 * ==============================================================================
 */
export const render_mebo_control_panel_content = () => {
  const wrap = el({ tag: "div", class_name: "control" });

  // Create controls grid and append all control elements
  const controlsGrid = el({ tag: "div", class_name: "controls-grid" });
  controlsGrid.append(
    render_movement_joystick(),
    render_claw_slider(),
    render_rotation_slider(),
    render_joint_slider({ id: "joint1", label: "Joint 1" }),
    render_joint_slider({ id: "joint2", label: "Joint 2" })
  );

  wrap.append(
    render_server_settings(),
    el({ tag: "div", class_name: "divider" }),
    render_robot_type_selector(),
    el({ tag: "div", class_name: "divider" }),
    render_robot_selector(),
    el({ tag: "div", class_name: "divider" }),
    render_stop_button(),
    controlsGrid
  );

  return render_card({
    title: "CONTROL PANEL",
    subtitle: "[MEBO]",
    body: wrap,
  });
};
