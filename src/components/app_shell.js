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

const create_sidebar_icon = ({ paths, extra_class = "" }) => {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", `sidebar__icon ${extra_class}`.trim());

  for (const d of paths) {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }

  return svg;
};

const create_sidebar_item = ({ id, title, label, is_active = false, paths }) => {
  const btn = el({
    tag: "button",
    class_name: `sidebar__item${is_active ? " sidebar__item--active" : ""}`,
    attrs: { id, type: "button", title },
  });
  btn.append(
    create_sidebar_icon({ paths, extra_class: "sidebar__item-icon" }),
    el({ tag: "span", class_name: "sidebar__item-label", text: label })
  );
  return btn;
};

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

  const main = el({ tag: "main", class_name: "workspace" });

  const sidebar = el({ tag: "nav", class_name: "sidebar", attrs: { id: "left-sidebar" } });
  const sidebar_top = el({ tag: "div", class_name: "sidebar__top" });
  const logo = el({ tag: "div", class_name: "sidebar__logo" });
  logo.append(
    create_sidebar_icon({
      paths: [
        "M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7l7-4z",
        "M12 8v8",
        "M8.5 12H15.5",
      ],
      extra_class: "sidebar__logo-icon",
    })
  );
  sidebar_top.append(
    logo,
    el({ tag: "div", class_name: "sidebar__brand", text: "WOWE TACTICAL C2" })
  );

  const sidebar_menu = el({ tag: "div", class_name: "sidebar__menu" });
  sidebar_menu.append(
    create_sidebar_item({
      id: "nav-dashboard",
      title: "Dashboard",
      label: "DASHBOARD",
      is_active: true,
      paths: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
    }),
    create_sidebar_item({
      id: "nav-settings",
      title: "Settings",
      label: "SETTINGS",
      paths: [
        "M4 6h16",
        "M4 12h16",
        "M4 18h16",
        "M8 4v4",
        "M15 10v4",
        "M11 16v4",
      ],
    })
  );

  const sidebar_bottom = el({ tag: "div", class_name: "sidebar__bottom" });
  sidebar_bottom.append(
    el({ tag: "div", class_name: "sidebar__status", text: "ONLINE" }),
    el({ tag: "div", class_name: "sidebar__version", text: "v1.0" }),
    el({ tag: "div", class_name: "sidebar__collapse", text: "<" })
  );
  sidebar.append(sidebar_top, sidebar_menu, sidebar_bottom);

  const dashboard_layout = el({ tag: "section", class_name: "layout", attrs: { id: "dashboard-layout" } });
  dashboard_layout.append(
    el({ tag: "section", class_name: "layout__left", attrs: { id: "left" } }),
    el({ tag: "aside", class_name: "layout__right", attrs: { id: "right" } })
  );

  const settings_view = el({
    tag: "section",
    class_name: "settings-view settings-view--hidden",
    attrs: { id: "settings-view" },
  });

  main.append(sidebar, dashboard_layout, settings_view);

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

