/*
 ==============================================================================
  WOWE Tactical C2 - JSON Script Parser (src/app/script_engine.js)

  Purpose:
  - Parse and validate the user's *simple JSON* script format:
      { "Parallel": [ { "alpha": ["Left", ...] }, { "bravo": [...] } ] }
    or:
      { "Series": [ ... ] }
  - Provides: parse_simple_json_script() for frontend validation only
  - Execution logic is handled by the backend
 ==============================================================================
*/

/**
 * @typedef {{type:"parallel"|"series", robots:Array<{robot_id:string, commands:string[]}>}} SimpleAst
 */

const norm_robot_id = (s) => String(s ?? "").trim().toLowerCase();

const norm_cmd = (s) => String(s ?? "").trim();

/**
 * Parse and validate a JSON script string.
 *
 * @param {{script_text: string}} options
 * @returns {{is_ok: boolean, ast?: SimpleAst, error?: string}}
 */
export const parse_simple_json_script = ({ script_text }) => {
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(String(script_text ?? ""));
  } catch (e) {
    return { is_ok: false, error: `Invalid JSON: ${String(e?.message ?? e)}` };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { is_ok: false, error: "Top-level JSON must be an object." };
  }

  // Accept exactly one key: "Parallel" OR "Series" (case-sensitive per your examples).
  const keys = Object.keys(/** @type {Record<string, unknown>} */(parsed));
  if (keys.length !== 1) {
    return { is_ok: false, error: 'Top-level must have exactly one key: "Parallel" or "Series".' };
  }

  const mode_key = keys[0];
  const mode =
    mode_key === "Parallel"
      ? "parallel"
      : mode_key === "Series"
        ? "series"
        : null;
  if (!mode) return { is_ok: false, error: 'Top-level key must be "Parallel" or "Series".' };

  const arr = /** @type {Record<string, unknown>} */ (parsed)[mode_key];
  if (!Array.isArray(arr)) return { is_ok: false, error: `"${mode_key}" must be an array.` };

  /** @type {Array<{robot_id:string, commands:string[]}>} */
  const robots = [];

  for (const item of arr) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { is_ok: false, error: `Each item in "${mode_key}" must be an object like { "alpha": ["Left", ...] }.` };
    }
    const item_keys = Object.keys(/** @type {Record<string, unknown>} */(item));
    if (item_keys.length !== 1) {
      return { is_ok: false, error: `Each item in "${mode_key}" must have exactly one robot key.` };
    }
    const robot_id_raw = item_keys[0];
    const robot_id = norm_robot_id(robot_id_raw);
    if (!robot_id) return { is_ok: false, error: "Robot id cannot be empty." };

    const cmds_raw = /** @type {Record<string, unknown>} */ (item)[robot_id_raw];
    if (!Array.isArray(cmds_raw)) return { is_ok: false, error: `Robot "${robot_id_raw}" value must be an array of commands.` };

    const commands = cmds_raw.map(norm_cmd).filter((x) => x.length > 0);
    robots.push({ robot_id, commands });
  }

  /** @type {SimpleAst} */
  const ast = { type: mode, robots };
  return { is_ok: true, ast };
};
