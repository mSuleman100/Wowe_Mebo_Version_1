/*
 ==============================================================================
  WOWE Tactical C2 - Backend API Client (src/api/robot_api.js)

  Author:   M. Suleman Anwar
  Date:     2026-01-15

  Purpose:
  - Single place for all network calls from the UI to the Python/FastAPI backend.
  - Components never call fetch() directly; they call these functions instead.

  UI Contract (current):
  - GET  /health
  - GET  /video/{feed_id}
  - POST /video/{feed_id}/upload    (ESP32-CAM pushes frames here)
  - POST /cmd/{cmd}
  - POST /sequence                 { steps: [...] }
 ==============================================================================
*/

import {
  DEFAULT_SERVER_ORIGIN,
  SERVER_ORIGIN_STORAGE_KEY,
} from "../app/constants.js";

/**
 * ==============================================================================
 *  build_url()
 *
 *  Purpose:
 *  - Normalize a backend origin + route path into a full URL
 *  - Append optional query parameters safely
 * ==============================================================================
 */
const build_url = ({ server_origin, path, query = {} }) => {
  // Build a fully-qualified URL from server origin + path + query params.
  const base = server_origin ?? DEFAULT_SERVER_ORIGIN;
  const normalized_base = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalized_path = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalized_base}${normalized_path}`);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
};

/**
 * ==============================================================================
 *  get_server_origin()
 *
 *  Purpose:
 *  - Read backend base URL from localStorage
 *  - Fall back to DEFAULT_SERVER_ORIGIN
 * ==============================================================================
 */
export const get_server_origin = () =>
  // Load backend origin from localStorage (falls back to DEFAULT_SERVER_ORIGIN).
  // Migration: old builds defaulted to :8000 while current backend runs on :8002.
  (() => {
    const stored = localStorage.getItem(SERVER_ORIGIN_STORAGE_KEY);
    if (!stored) return DEFAULT_SERVER_ORIGIN;
    if (stored.trim() === "http://localhost:8000") {
      localStorage.setItem(SERVER_ORIGIN_STORAGE_KEY, DEFAULT_SERVER_ORIGIN);
      return DEFAULT_SERVER_ORIGIN;
    }
    return stored;
  })();

/**
 * ==============================================================================
 *  set_server_origin()
 *
 *  Purpose:
 *  - Persist backend base URL to localStorage (simple validation)
 * ==============================================================================
 */
export const set_server_origin = ({ server_origin }) => {
  // Save backend origin to localStorage (simple validation).
  const trimmed = String(server_origin ?? "").trim();
  if (!trimmed) return { is_ok: false, error: "Server origin cannot be empty." };

  localStorage.setItem(SERVER_ORIGIN_STORAGE_KEY, trimmed);
  return { is_ok: true };
};

/**
 * ==============================================================================
 *  get_video_frame_url()
 *
 *  Purpose:
 *  - Return a cache-busted URL to fetch one JPEG frame for a feed
 * ==============================================================================
 */
export const get_video_frame_url = ({ feed_id, server_origin }) =>
  // Return a cache-busted URL for a single video frame.
  build_url({
    server_origin,
    path: `/video/${encodeURIComponent(feed_id)}`,
    query: { ts: Date.now() },
  });

/**
 * ==============================================================================
 *  get_mjpeg_stream_url()
 *
 *  Purpose:
 *  - Return a URL to the MJPEG stream endpoint (/mjpeg/{feed_id})
 * ==============================================================================
 */
export const get_mjpeg_stream_url = ({ feed_id, server_origin }) =>
  build_url({
    server_origin,
    path: `/mjpeg/${encodeURIComponent(feed_id)}`,
    query: { ts: Date.now() },
  });

/**
 * ==============================================================================
 *  send_cmd()
 *
 *  Purpose:
 *  - POST /cmd/{cmd} to the backend (movement/actions/IR)
 * ==============================================================================
 */
export const send_cmd = async ({ cmd, device_id, server_origin, signal }) => {
  // Send a single command to the backend (movement/action/IR).
  // device_id: "alpha", "bravo", "charlie", or "delta"
  const url = build_url({
    server_origin,
    path: `/cmd/${encodeURIComponent(cmd)}`,
    query: device_id ? { device_id } : {},
  });

  try {
    const response = await fetch(url, { method: "POST", signal });
    if (!response.ok)
      return { is_ok: false, error: `Command failed (${response.status}).` };

    return { is_ok: true };
  } catch (error) {
    return { is_ok: false, error: String(error?.message ?? error) };
  }
};

/**
 * ==============================================================================
 *  send_script()
 *
 *  Purpose:
 *  - POST /api/scripts/execute with validated JSON script
 * ==============================================================================
 */
export const send_script = async ({ script, server_origin, signal }) => {
  const url = build_url({ server_origin, path: "/api/scripts/execute" });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ script }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      return { is_ok: false, error: `Script execution failed (${response.status}): ${text}` };
    }

    const data = await response.json();
    return { is_ok: true, data };
  } catch (error) {
    return { is_ok: false, error: String(error?.message ?? error) };
  }
};

/**
 * ==============================================================================
 *  send_halt()
 *
 *  Purpose:
 *  - Convenience wrapper around send_cmd("halt")
 * ==============================================================================
 */
export const send_halt = async ({ device_id, server_origin, signal }) =>
  // Convenience helper for global halt.
  send_cmd({ cmd: "halt", device_id, server_origin, signal });

/**
 * ==============================================================================
 *  send_sequence()
 *
 *  Purpose:
 *  - POST /sequence with a list of steps (strings)
 * ==============================================================================
 */
export const send_sequence = async ({ steps, server_origin, signal }) => {
  // Send a sequence of steps to be executed by backend/robots.
  const url = build_url({ server_origin, path: "/sequence" });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ steps }),
      signal,
    });

    if (!response.ok)
      return { is_ok: false, error: `Sequence failed (${response.status}).` };

    return { is_ok: true };
  } catch (error) {
    return { is_ok: false, error: String(error?.message ?? error) };
  }
};

/**
 * ==============================================================================
 *  check_health()
 *
 *  Purpose:
 *  - GET /health (used by the UI ONLINE/OFFLINE indicator)
 * ==============================================================================
 */
export const check_health = async ({ server_origin, signal }) => {
  // Quick backend reachability check (drives ONLINE/OFFLINE pill in UI).
  const url = build_url({ server_origin, path: "/health" });
  const timeout_ms = 1200;

  const timeout_controller = new AbortController();
  const timeout_id = setTimeout(() => timeout_controller.abort(), timeout_ms);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: timeout_controller.signal,
    });
    clearTimeout(timeout_id);

    if (!response.ok) return { is_ok: false, error: "Unhealthy backend." };
    return { is_ok: true };
  } catch (error) {
    clearTimeout(timeout_id);
    return { is_ok: false, error: String(error?.message ?? error) };
  }
};

export const register_robot = async ({ name, type, device_id, feed_id, server_origin, signal }) => {
  const url = build_url({ server_origin, path: "/robots/register" });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, type, device_id, feed_id }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      return { is_ok: false, error: `Robot registration failed (${response.status}): ${text}` };
    }

    const data = await response.json();
    return { is_ok: true, data };
  } catch (error) {
    return { is_ok: false, error: String(error?.message ?? error) };
  }
};

