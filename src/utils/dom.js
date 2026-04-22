/*
 ==============================================================================
  WOWE Tactical C2 - DOM Utilities (src/utils/dom.js)

  Author:   M. Suleman Anwar
  Date:     2026-01-15

  Purpose:
  - Small helpers for creating/mounting DOM nodes without a framework.
  - Keeps components clean and consistent.
 ==============================================================================
*/

export const el = ({ tag, class_name, attrs = {}, text }) => {
  // Create an element and apply optional class, attributes, and text content.
  const element = document.createElement(tag);
  if (class_name) element.className = class_name;
  if (text !== undefined) element.textContent = String(text);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    element.setAttribute(key, String(value));
  }

  return element;
};

/**
 * ==============================================================================
 *  mount()
 *
 *  Purpose:
 *  - Replace the contents of a root element with a single child node.
 *  - Used for mounting the entire app into #app.
 * ==============================================================================
 */
export const mount = ({ root, child }) => {
  // Replace root contents with a single child node (app mount pattern).
  root.replaceChildren(child);
  return root;
};

/**
 * ==============================================================================
 *  qs()
 *
 *  Purpose:
 *  - Query a single element under a given root.
 * ==============================================================================
 */
export const qs = ({ root = document, selector }) => root.querySelector(selector);

/**
 * ==============================================================================
 *  qsa()
 *
 *  Purpose:
 *  - Query all elements under a given root and return them as a real Array.
 * ==============================================================================
 */
export const qsa = ({ root = document, selector }) =>
  Array.from(root.querySelectorAll(selector));

