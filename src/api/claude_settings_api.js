import { get_server_origin } from "./robot_api.js";

const build_url = ({ path, server_origin }) => {
  const base = server_origin ?? get_server_origin();
  const normalized_base = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalized_base}${path}`;
};

export const fetch_claude_settings = async ({ server_origin, signal } = {}) => {
  try {
    const response = await fetch(build_url({ path: "/claude/settings", server_origin }), {
      method: "GET",
      signal,
    });
    if (!response.ok) return { is_ok: false, error: `Failed (${response.status})` };
    return { is_ok: true, data: await response.json() };
  } catch (error) {
    return { is_ok: false, error: String(error?.message ?? error) };
  }
};

export const save_claude_settings_remote = async ({ api_key, model, server_origin, signal }) => {
  try {
    const response = await fetch(build_url({ path: "/claude/settings", server_origin }), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key, model }),
      signal,
    });
    if (!response.ok) {
      const text = await response.text();
      return { is_ok: false, error: `Failed (${response.status}): ${text}` };
    }
    return { is_ok: true, data: await response.json() };
  } catch (error) {
    return { is_ok: false, error: String(error?.message ?? error) };
  }
};

export const update_claude_model_remote = async ({ model, server_origin, signal }) => {
  try {
    const response = await fetch(build_url({ path: "/claude/settings/model", server_origin }), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model }),
      signal,
    });
    if (!response.ok) {
      const text = await response.text();
      return { is_ok: false, error: `Failed (${response.status}): ${text}` };
    }
    return { is_ok: true, data: await response.json() };
  } catch (error) {
    return { is_ok: false, error: String(error?.message ?? error) };
  }
};

export const clear_claude_settings_remote = async ({ server_origin, signal } = {}) => {
  try {
    const response = await fetch(build_url({ path: "/claude/settings", server_origin }), {
      method: "DELETE",
      signal,
    });
    if (!response.ok) {
      const text = await response.text();
      return { is_ok: false, error: `Failed (${response.status}): ${text}` };
    }
    return { is_ok: true, data: await response.json() };
  } catch (error) {
    return { is_ok: false, error: String(error?.message ?? error) };
  }
};
