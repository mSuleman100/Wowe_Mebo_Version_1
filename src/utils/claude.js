/*
 ==============================================================================
  WOWE Tactical C2 - Claude API Global Utility (src/utils/claude.js)

  Author:   M. Suleman Anwar
  Date:     2026-04-27

  Purpose:
  - Global utility for Claude API access throughout the app
  - Automatically uses API key from CONFIG panel
  - Provides simplified interface for common operations
  - Works seamlessly for both WOWE and MEBO robot types

  Usage:
  - import { claude } from "../utils/claude.js"
  - if (claude.is_configured()) { ... }
  - const response = await claude.call({ messages: [...] })
 ==============================================================================
*/

import {
  get_claude_api_key,
  is_claude_api_configured,
  call_claude_api,
  call_claude_api_streaming,
  create_message,
  format_claude_response,
} from "../api/claude_api.js";

/**
 * Claude API global utility object
 * Provides centralized access to Claude API functionality
 */
export const claude = {
  /**
   * Check if Claude API is configured (key is set)
   */
  is_configured: is_claude_api_configured,

  /**
   * Get current API key
   */
  get_key: get_claude_api_key,

  /**
   * Make a Claude API call
   * @param {Object} options - { messages, system, max_tokens, temperature }
   * @returns {Promise<{content, stop_reason, usage}>}
   */
  call: call_claude_api,

  /**
   * Make a streaming Claude API call
   * @param {Object} options - { messages, system, on_chunk, max_tokens, temperature }
   * @returns {Promise}
   */
  stream: call_claude_api_streaming,

  /**
   * Create a message object
   * @param {string} role - "user" or "assistant"
   * @param {string} content - Message text
   */
  message: create_message,

  /**
   * Format response text
   * @param {Object} response - Response object from call()
   */
  format: format_claude_response,

  /**
   * Convenient helper: Ask Claude a question and get a response
   * @param {string} question - Question text
   * @param {string} system - Optional system prompt
   * @returns {Promise<string>} - Response text
   */
  ask: async (question, system = null) => {
    const response = await call_claude_api({
      messages: [create_message("user", question)],
      system,
    });
    return format_claude_response(response);
  },

  /**
   * Convenient helper: Stream a question and get real-time chunks
   * @param {string} question - Question text
   * @param {Function} on_chunk - Callback for each chunk
   * @param {string} system - Optional system prompt
   */
  stream_ask: async (question, on_chunk, system = null) => {
    await call_claude_api_streaming({
      messages: [create_message("user", question)],
      on_chunk,
      system,
    });
  },
};

/**
 * Make claude available globally (window.claude)
 * Useful for debugging and quick access
 */
if (typeof window !== "undefined") {
  window.claude = claude;
}
