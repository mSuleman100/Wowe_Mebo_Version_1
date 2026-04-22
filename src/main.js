/*
 ==============================================================================
  WOWE Tactical C2 - Frontend Entrypoint (src/main.js)

  Author:   M. Suleman Anwar
  Date:     2026-01-15

  Purpose:
  - Single JavaScript entrypoint loaded by index.html
  - Bootstraps the UI by calling bootstrap_app()
 ==============================================================================
*/

const root = document.getElementById("app");

const render_fatal = (title, err) => {
  // Make failures visible even when the console isn't open.
  // (Useful when an import/runtime error prevents the UI from mounting.)
  const msg =
    err instanceof Error
      ? err.stack || err.message
      : typeof err === "string"
        ? err
        : JSON.stringify(err, null, 2);

  const container = document.createElement("div");
  container.style.cssText = [
    "position:fixed",
    "inset:12px",
    "z-index:9999",
    "padding:12px",
    "border:1px solid rgba(255,59,59,0.55)",
    "border-radius:8px",
    "background:rgba(10, 24, 36, 0.92)",
    "color:rgba(235,245,255,0.96)",
    "font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace",
    "font-size:12px",
    "overflow:auto",
    "white-space:pre-wrap",
  ].join(";");
  container.textContent = `${title}\n\n${msg}`;

  if (root) root.replaceChildren(container);
  else document.body.append(container);
};

window.addEventListener("error", (e) => {
  render_fatal("WOWE UI failed to start (window.error)", e?.error ?? e?.message ?? String(e));
});

window.addEventListener("unhandledrejection", (e) => {
  render_fatal("WOWE UI failed to start (unhandledrejection)", e?.reason ?? String(e));
});

// Provide immediate feedback that JS loaded (helps debug "blank screen" cases).
if (root) root.textContent = "Loading WOWE UI…";

// Mount the dashboard into <div id="app"></div>
// NOTE: Use dynamic import so we can show a fatal overlay even if a dependency
// has an ESM linking error (missing export, syntax error in an imported module, etc.).
(async () => {
  try {
    const mod = await import("./app/bootstrap.js");
    if (!mod || typeof mod.bootstrap_app !== "function") {
      throw new Error('Module "./app/bootstrap.js" did not export bootstrap_app()');
    }
    mod.bootstrap_app({ root_element_id: "app" });
  } catch (e) {
    render_fatal("WOWE UI failed to start (bootstrap import/execute)", e);
    throw e;
  }
})();

