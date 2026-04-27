# Claude API Integration Guide

## Overview

The Claude API is now **automatically integrated** throughout the entire WOWE Tactical C2 web app. Any component in the application can access and use the Claude API key stored in the CONFIG panel—no additional setup required.

The API key is:
- ✅ Automatically loaded from localStorage (CONFIG panel)
- ✅ Available for both WOWE and MEBO robot types
- ✅ Accessible throughout the app via imports or global window object
- ✅ Checked at app startup and logged to console

---

## Quick Start

### Method 1: Import the Global Claude Utility (Recommended)

```javascript
import { claude } from "../utils/claude.js";

// Check if API is configured
if (claude.is_configured()) {
  // Make a simple API call
  const response = await claude.ask("What is the weather?");
  console.log(response);
}
```

### Method 2: Use Global Window Object (From Browser Console)

```javascript
// Access from any component or browser console
if (window.claude_api.is_configured()) {
  const response = await window.claude_api.ask("Hello!");
  console.log(response);
}
```

---

## API Reference

### `claude.is_configured()`
Check if Claude API key is set in CONFIG panel.

```javascript
if (claude.is_configured()) {
  console.log("✓ API key is configured");
} else {
  console.log("⚠ Please set API key in CONFIG panel");
}
```

**Returns**: `boolean`

---

### `claude.get_key()`
Get the currently stored API key.

```javascript
const api_key = claude.get_key();
console.log(api_key.slice(0, 10) + "...");
```

**Returns**: `string` (API key or empty string if not set)

---

### `claude.ask(question, system?)`
Simple helper for single-turn conversations.

```javascript
const question = "Summarize the robot status logs";
const response = await claude.ask(question);
console.log(response);
```

**Parameters**:
- `question` (string): Your question/prompt
- `system` (string, optional): System prompt for context

**Returns**: `Promise<string>` - Claude's response

**Example with system prompt**:
```javascript
const response = await claude.ask(
  "What's the next command?",
  "You are a tactical robot command AI. Keep responses brief."
);
```

---

### `claude.stream_ask(question, on_chunk, system?)`
Stream a response in real-time chunks (useful for UI updates).

```javascript
let full_response = "";

await claude.stream_ask(
  "Describe the robot's current state",
  (chunk) => {
    full_response += chunk;
    console.log("Chunk:", chunk);
  }
);

console.log("Complete response:", full_response);
```

**Parameters**:
- `question` (string): Your question/prompt
- `on_chunk` (function): Callback called for each text chunk
- `system` (string, optional): System prompt

**Returns**: `Promise` - Resolves when stream completes

---

### `claude.call(options)`
Advanced API call with full control.

```javascript
const response = await claude.call({
  messages: [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
    { role: "user", content: "What's your name?" }
  ],
  system: "You are a helpful robot AI.",
  max_tokens: 500,
  temperature: 0.7
});

console.log(response.content);
console.log(response.usage);
```

**Parameters**:
- `messages` (array): Array of message objects `{role, content}`
- `system` (string, optional): System prompt
- `max_tokens` (number, default: 1024): Max response length
- `temperature` (number, default: 1.0): Creativity (0-2)

**Returns**: `Promise<{content, stop_reason, usage}>`

---

### `claude.stream(options)`
Advanced streaming with full control.

```javascript
await claude.stream({
  messages: [{ role: "user", content: "Count to 5" }],
  system: "You are a helpful assistant.",
  on_chunk: (chunk) => {
    process.stdout.write(chunk);
  },
  max_tokens: 1024,
  temperature: 0.8
});
```

**Parameters**: Same as `call()` with required `on_chunk` callback

**Returns**: `Promise`

---

### `claude.message(role, content)`
Helper to create a message object.

```javascript
const user_msg = claude.message("user", "Hello Claude!");
const assistant_msg = claude.message("assistant", "Hello!");

const messages = [user_msg, assistant_msg];
```

**Parameters**:
- `role` (string): "user" or "assistant"
- `content` (string): Message text

**Returns**: `{role, content}` object

---

### `claude.format(response)`
Extract text from response object.

```javascript
const response = await claude.call({ messages: [...] });
const text = claude.format(response);
```

**Parameters**: Response object from `call()`

**Returns**: `string` - Extracted text content

---

## Real-World Examples

### Example 1: Command Suggestion for Robot

```javascript
import { claude } from "../utils/claude.js";

const suggest_next_command = async (robot_status) => {
  try {
    const suggestion = await claude.ask(
      `Current robot status: ${robot_status}. What should be the next command?`,
      "You are a tactical robot command AI. Suggest safe, efficient commands only."
    );
    
    console.log("Suggested command:", suggestion);
    return suggestion;
  } catch (error) {
    console.error("Claude API error:", error.message);
    return null;
  }
};

// Usage
const status = "idle, battery 85%, all systems ok";
await suggest_next_command(status);
```

### Example 2: Real-Time Log Analysis

```javascript
import { claude } from "../utils/claude.js";

const analyze_logs_streaming = async (logs) => {
  console.log("Analyzing logs...");
  
  await claude.stream_ask(
    `Analyze these robot logs and identify issues:\n${logs}`,
    (chunk) => {
      // Display chunk in real-time UI
      document.getElementById("analysis").textContent += chunk;
    },
    "You are a robot diagnostics expert. Be concise but thorough."
  );
};
```

### Example 3: Multi-Turn Conversation

```javascript
import { claude } from "../utils/claude.js";

const conversation = async () => {
  const messages = [];
  
  // User message 1
  messages.push(claude.message("user", "What's the robot's purpose?"));
  
  // Get response
  let response = await claude.call({
    messages,
    system: "You are knowledgeable about tactical robots."
  });
  messages.push(claude.message("assistant", response.content));
  console.log("Assistant:", response.content);
  
  // User message 2 (continues conversation)
  messages.push(claude.message("user", "How can it improve performance?"));
  
  // Get follow-up response
  response = await claude.call({
    messages,
    system: "You are knowledgeable about tactical robots."
  });
  console.log("Assistant:", response.content);
};

await conversation();
```

### Example 4: Error Handling

```javascript
import { claude } from "../utils/claude.js";

const safe_claude_call = async (prompt) => {
  // Check if configured
  if (!claude.is_configured()) {
    console.error("API key not set. Go to CONFIG panel.");
    return null;
  }
  
  try {
    const response = await claude.ask(prompt);
    return response;
  } catch (error) {
    if (error.message.includes("API key not configured")) {
      console.error("Set your API key in CONFIG panel");
    } else if (error.message.includes("Network error")) {
      console.error("Network connection issue");
    } else {
      console.error("API error:", error.message);
    }
    return null;
  }
};
```

---

## Integration Points

The Claude API can be used in any component:

### In Control Panel
```javascript
// src/components/control_panel.js
import { claude } from "../utils/claude.js";

// Suggest next move based on robot state
const next_move = await claude.ask("What move next?");
```

### In Script Manager
```javascript
// src/components/script_manager.js
import { claude } from "../utils/claude.js";

// Generate script from natural language
const script = await claude.ask("Generate a robot script to pick up the object");
```

### In MEBO Control Panel
```javascript
// src/components/mebo_control_panel.js
import { claude } from "../utils/claude.js";

// Get tactical advice
const strategy = await claude.ask("Best strategy for current mission?");
```

### In Utilities
```javascript
// src/utils/robot_strategy.js
import { claude } from "./claude.js";

export const plan_mission = async (objectives) => {
  return await claude.ask(`Plan a mission for: ${objectives}`);
};
```

---

## Configuration

### Set API Key
1. Click **CONFIG** tab
2. Paste your Claude API key
3. Click **SAVE KEY**
4. ✓ API is now available throughout the app

### Get API Key
Visit: https://console.anthropic.com/

### Clear API Key
1. Click **CONFIG** tab
2. Click **CLEAR KEY**
3. API calls will fail until a new key is set

---

## Error Messages

| Error | Solution |
|-------|----------|
| "Claude API key not configured" | Set key in CONFIG panel |
| "API Error: 401 Unauthorized" | Check that API key is correct |
| "Network error: Unable to reach Claude API" | Check internet connection |
| "Messages array is required" | Pass messages parameter to `call()` |
| "on_chunk callback is required" | Pass `on_chunk` function for streaming |

---

## Model & Limits

- **Model**: `claude-opus-4-7` (latest Anthropic model)
- **Default Max Tokens**: 1024 (can be customized)
- **Default Temperature**: 1.0 (can be customized)
- **Rate Limits**: Follow Anthropic's API limits
- **Cost**: Billed per API call (check Anthropic pricing)

---

## Debugging

### Check API Status in Browser Console
```javascript
// From any browser page
console.log("API Configured:", window.claude_api.is_configured());
console.log("API Key:", window.claude_api.get_key().slice(0, 10) + "...");
```

### Test API Call in Console
```javascript
window.claude_api.ask("Hello, Claude!").then(console.log);
```

### Monitor Network Requests
Open DevTools → Network tab → Filter by "api.anthropic.com"

---

## Security Notes

✅ API key is stored in **browser localStorage**  
✅ **Never commit API key** to Git (it's local-only)  
✅ Key is **masked in CONFIG panel UI** (password input)  
✅ HTTPS is **required** for production (enforced by Anthropic)  
⚠️ **Keep key private** — don't share browser session with untrusted users

---

## Available for Both Robot Types

- ✅ Works with **WOWE** robots
- ✅ Works with **MEBO** robots
- ✅ Automatically available regardless of selected robot type
- ✅ Available immediately after app startup

---

## Next Steps

1. **Set API key** in CONFIG panel
2. **Test** by calling `window.claude_api.ask("test")`
3. **Import in components** and start building features
4. **Check logs** for startup confirmation message

**The Claude API is now fully integrated and ready to use! 🚀**
