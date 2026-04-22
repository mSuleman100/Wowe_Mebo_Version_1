/*
 ==============================================================================
  WOWE Tactical C2 - App Shell Component (src/components/app_shell.js)

  Author:   M. Suleman Anwar
  Date:     2026-01-15

  Purpose:
  - Renders the overall dashboard chrome:
      - Topbar (title + health pill)
      - Main layout (left video wall + right control panels)
      - Bottom global HALT bar
 ==============================================================================
*/

import { el } from "../utils/dom.js";

/**
 * ==============================================================================
 *  render_app_shell()
 *
 *  Purpose:
 *  - Render the overall dashboard frame:
 *      - topbar + main layout + bottombar
 * ==============================================================================
 */
export const render_app_shell = () => {
  // Create the main app container with 3 rows: topbar / main / bottombar.
  const app = el({ tag: "div", class_name: "c2" });

  const topbar = el({ tag: "header", class_name: "topbar" });
  topbar.append(
    el({ tag: "div", class_name: "topbar__title", text: "WOWE TACTICAL C2" }),
    el({
      tag: "div",
      class_name: "topbar__subtitle",
      text: "SWARM COMMAND // v1.0 (UI)",
    }),
    el({ tag: "div", class_name: "topbar__right", attrs: { id: "conn-pill" } })
  );

  const main = el({ tag: "main", class_name: "layout" });
  main.append(
    el({ tag: "section", class_name: "layout__left", attrs: { id: "left" } }),
    el({ tag: "aside", class_name: "layout__right", attrs: { id: "right" } })
  );

  const bottombar = el({ tag: "footer", class_name: "bottombar" });
  bottombar.append(
    el({
      tag: "button",
      class_name: "halt",
      attrs: { id: "halt-btn", type: "button" },
      text: "GLOBAL HALT (SPACEBAR)",
    })
  );

  app.append(topbar, main, bottombar);
  return app;
};

