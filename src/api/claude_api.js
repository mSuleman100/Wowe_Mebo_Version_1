/*
 ==============================================================================
  WOWE Tactical C2 - Claude API Integration (src/api/claude_api.js)

  Author:   M. Suleman Anwar
  Date:     2026-04-27

  Purpose:
  - Provides Claude API integration for the entire application
  - Automatically uses stored API key from CONFIG panel
  - Handles API calls, error handling, and streaming responses
  - Available for both WOWE and MEBO robot types

  Notes:
  - API key is loaded from localStorage (stored in CONFIG panel)
  - All functions automatically use the stored key
 ==============================================================================
*/

import { load_claude_api_key, load_claude_model } from "../components/config_panel.js";
import { get_server_origin } from "./robot_api.js";

// Backend proxy endpoint (avoids CORS issues)
const CLAUDE_PROXY_ENDPOINT = () => {
  const base = get_server_origin();
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalized}/claude/settings/call`;
};

/**
 * ==============================================================================
 *  get_claude_api_key()
 *
 *  Purpose:
 *  - Retrieve currently stored Claude API key
 *  - Returns empty string if no key is configured
 * ==============================================================================
 */
export const get_claude_api_key = () => {
  return load_claude_api_key();
};

/**
 * ==============================================================================
 *  get_claude_model()
 *
 *  Purpose:
 *  - Retrieve currently selected Claude model
 *  - Returns the model ID string (e.g., claude-opus-4-7)
 * ==============================================================================
 */
export const get_claude_model = () => {
  return load_claude_model();
};

/**
 * ==============================================================================
 *  is_claude_api_configured()
 *
 *  Purpose:
 *  - Check if Claude API key is set in CONFIG panel
 * ==============================================================================
 */
export const is_claude_api_configured = () => {
  return get_claude_api_key().length > 0;
};

/**
 * ==============================================================================
 *  call_claude_api()
 *
 *  Purpose:
 *  - Make a request to Claude API with stored API key
 *  - Automatically handles authentication
 *
 *  Parameters:
 *  - messages: Array of message objects [{role, content}, ...]
 *  - system: Optional system prompt
 *  - max_tokens: Optional max tokens (default: 1024)
 *  - temperature: Optional temperature (default: 1.0)
 *
 *  Returns:
 *  - Promise resolving to response object with content and usage info
 * ==============================================================================
 */
export const call_claude_api = async ({
  messages,
  system,
  max_tokens = 1024,
  temperature = 1.0,
}) => {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messages array is required and cannot be empty.");
  }

  const request_body = {
    messages,
    max_tokens,
    temperature,
  };

  if (system) {
    request_body.system = system;
  }

  try {
    const response = await fetch(CLAUDE_PROXY_ENDPOINT(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request_body),
    });

    if (!response.ok) {
      const error_data = await response.json();
      const error_message = error_data?.error || `API Error: ${response.statusText}`;
      throw new Error(error_message);
    }

    const data = await response.json();

    if (!data.is_ok) {
      throw new Error(data.error || "Claude API returned an error");
    }

    return {
      content: data.content || "",
      stop_reason: "end_turn",
      usage: {},
    };
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Network error: Unable to reach backend. Check your connection.");
    }
    throw error;
  }
};

/**
 * ==============================================================================
 *  call_claude_api_streaming()
 *
 *  Purpose:
 *  - Make a streaming request to Claude API
 *  - Useful for real-time response display
 *
 *  Parameters:
 *  - messages: Array of message objects
 *  - system: Optional system prompt
 *  - on_chunk: Callback function called for each streamed text chunk
 *  - max_tokens: Optional max tokens (default: 1024)
 *  - temperature: Optional temperature (default: 1.0)
 *
 *  Returns:
 *  - Promise resolving when stream completes
 * ==============================================================================
 */
export const call_claude_api_streaming = async ({
  messages,
  system,
  on_chunk,
  max_tokens = 1024,
  temperature = 1.0,
}) => {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messages array is required and cannot be empty.");
  }

  if (typeof on_chunk !== "function") {
    throw new Error("on_chunk callback is required for streaming.");
  }

  const request_body = {
    messages,
    max_tokens,
    temperature,
  };

  if (system) {
    request_body.system = system;
  }

  try {
    const response = await fetch(CLAUDE_PROXY_ENDPOINT(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request_body),
    });

    if (!response.ok) {
      const error_data = await response.json();
      const error_message = error_data?.error || `API Error: ${response.statusText}`;
      throw new Error(error_message);
    }

    const data = await response.json();
    if (!data.is_ok) {
      throw new Error(data.error || "Claude API returned an error");
    }

    on_chunk(data.content || "");
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Network error: Unable to reach backend. Check your connection.");
    }
    throw error;
  }
};

/**
 * ==============================================================================
 *  create_message()
 *
 *  Purpose:
 *  - Helper to create a message object for Claude API
 *
 *  Parameters:
 *  - role: "user" or "assistant"
 *  - content: Message text content
 * ==============================================================================
 */
export const create_message = (role, content) => {
  return { role, content };
};

/**
 * ==============================================================================
 *  format_claude_response()
 *
 *  Purpose:
 *  - Extract and format Claude API response text
 * ==============================================================================
 */
export const format_claude_response = (response) => {
  return response?.content || "";
};
