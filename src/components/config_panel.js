/*
 ==============================================================================
  WOWE Tactical C2 - Config Panel Component (src/components/config_panel.js)

  Author:   M. Suleman Anwar
  Date:     2026-04-27

  Purpose:
  - Renders the CONFIG panel for API key management
  - Secure storage of Claude API key in localStorage
  - Clean, professional UI that matches the tactical design

  Notes:
  - Event handlers + persistence are wired in src/app/bootstrap.js
 ==============================================================================
*/

import { el } from "../utils/dom.js";

const CLAUDE_API_KEY_STORAGE_KEY = "claude_api_key";
const CLAUDE_MODEL_STORAGE_KEY = "claude_model";

const CLAUDE_MODELS = {
  HAIKU: "claude-haiku-4-5-20251001",
  SONNET: "claude-sonnet-4-6",
  OPUS: "claude-opus-4-7",
};

/**
 * ==============================================================================
 *  load_claude_api_key()
 *
 *  Purpose:
 *  - Retrieve Claude API key from localStorage
 * ==============================================================================
 */
export const load_claude_api_key = () => {
  return localStorage.getItem(CLAUDE_API_KEY_STORAGE_KEY) || "";
};

/**
 * ==============================================================================
 *  save_claude_api_key()
 *
 *  Purpose:
 *  - Persist Claude API key to localStorage
 * ==============================================================================
 */
export const save_claude_api_key = (api_key) => {
  if (api_key && api_key.trim()) {
    localStorage.setItem(CLAUDE_API_KEY_STORAGE_KEY, api_key.trim());
    return true;
  }
  return false;
};

/**
 * ==============================================================================
 *  clear_claude_api_key()
 *
 *  Purpose:
 *  - Remove Claude API key from localStorage
 * ==============================================================================
 */
export const clear_claude_api_key = () => {
  localStorage.removeItem(CLAUDE_API_KEY_STORAGE_KEY);
};

/**
 * ==============================================================================
 *  load_claude_model()
 *
 *  Purpose:
 *  - Retrieve selected Claude model from localStorage
 * ==============================================================================
 */
export const load_claude_model = () => {
  return localStorage.getItem(CLAUDE_MODEL_STORAGE_KEY) || CLAUDE_MODELS.OPUS;
};

/**
 * ==============================================================================
 *  save_claude_model()
 *
 *  Purpose:
 *  - Persist selected Claude model to localStorage
 * ==============================================================================
 */
export const save_claude_model = (model) => {
  if (model && Object.values(CLAUDE_MODELS).includes(model)) {
    localStorage.setItem(CLAUDE_MODEL_STORAGE_KEY, model);
    return true;
  }
  return false;
};

/**
 * ==============================================================================
 *  render_config_panel_content()
 *
 *  Purpose:
 *  - Render the configuration options (Claude API key, etc.)
 * ==============================================================================
 */
export const render_config_panel_content = () => {
  const wrap = el({ tag: "div", class_name: "config" });

  // Claude API Key Section
  const api_key_section = el({ tag: "div", class_name: "config__section" });
  api_key_section.append(
    el({
      tag: "label",
      class_name: "label",
      attrs: { for: "claude-api-key" },
      text: "Claude API Key",
    }),
    el({
      tag: "input",
      class_name: "input",
      attrs: {
        id: "claude-api-key",
        type: "password",
        placeholder: "sk-...",
        autocomplete: "off",
      },
    }),
    el({
      tag: "div",
      class_name: "config__help-text",
      text: "Get your API key from https://console.anthropic.com/",
    })
  );

  // Claude Model Selection
  const model_section = el({ tag: "div", class_name: "config__section" });
  const model_select = el({
    tag: "select",
    class_name: "input",
    attrs: { id: "claude-model-select" },
  });

  model_select.append(
    el({
      tag: "option",
      attrs: { value: CLAUDE_MODELS.HAIKU },
      text: "Haiku 4.5 (Fastest, Cheapest)",
    }),
    el({
      tag: "option",
      attrs: { value: CLAUDE_MODELS.SONNET },
      text: "Sonnet 4.6 (Balanced)",
    }),
    el({
      tag: "option",
      attrs: { value: CLAUDE_MODELS.OPUS },
      text: "Opus 4.7 (Most Capable)",
    })
  );

  model_select.value = load_claude_model();

  model_section.append(
    el({
      tag: "label",
      class_name: "label",
      attrs: { for: "claude-model-select" },
      text: "Claude Model",
    }),
    model_select,
    el({
      tag: "div",
      class_name: "config__help-text",
      text: "Choose based on speed/cost vs. capability tradeoff. Haiku for real-time, Sonnet for balance, Opus for complex reasoning.",
    })
  );

  // Action Buttons
  const buttons = el({ tag: "div", class_name: "config__buttons" });
  buttons.append(
    el({
      tag: "button",
      class_name: "btn btn--primary",
      attrs: { id: "save-claude-api-key", type: "button" },
      text: "SAVE KEY",
    }),
    el({
      tag: "button",
      class_name: "btn btn--secondary",
      attrs: { id: "clear-claude-api-key", type: "button" },
      text: "CLEAR KEY",
    })
  );

  // Status indicator
  const status = el({
    tag: "div",
    class_name: "config__status",
    attrs: { id: "config-status" },
  });

  wrap.append(api_key_section, model_section, buttons, status);
  return wrap;
};

/**
 * ==============================================================================
 *  render_config_card()
 *
 *  Purpose:
 *  - Render config panel with card styling
 * ==============================================================================
 */
export const render_config_card = () => {
  const card = el({ tag: "section", class_name: "card" });

  const header = el({ tag: "header", class_name: "card__header" });
  header.append(
    el({ tag: "div", class_name: "card__title", text: "CONFIG" }),
    el({
      tag: "div",
      class_name: "card__subtitle",
      text: "SETTINGS",
    })
  );

  const content = el({ tag: "div", class_name: "card__body" });
  content.append(render_config_panel_content());

  card.append(header, content);
  return card;
};
