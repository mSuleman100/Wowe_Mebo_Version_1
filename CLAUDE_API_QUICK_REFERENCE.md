# Claude API - Quick Reference

## Import & Check Configuration

```javascript
import { claude } from "../utils/claude.js";

// Verify API is ready
if (!claude.is_configured()) {
  alert("Please set Claude API key in CONFIG panel");
  return;
}
```

---

## Simple Question & Answer

```javascript
// Ask a single question
const answer = await claude.ask("What is 2+2?");
console.log(answer); // "4"
```

---

## With System Prompt (Context)

```javascript
const response = await claude.ask(
  "What's the next command?",
  "You are a tactical robot AI. Be concise."
);
```

---

## Stream Real-Time Response

```javascript
let output = "";

await claude.stream_ask(
  "Describe the robot status",
  (chunk) => {
    output += chunk;
    // Update UI in real-time
    document.getElementById("response").textContent = output;
  }
);
```

---

## Multi-Turn Conversation

```javascript
const messages = [];

// Message 1
messages.push(claude.message("user", "Hello"));
let res = await claude.call({ messages });
messages.push(claude.message("assistant", res.content));

// Message 2 (builds on context)
messages.push(claude.message("user", "What's your name?"));
res = await claude.call({ messages });
console.log(res.content);
```

---

## Advanced: Full Control

```javascript
const response = await claude.call({
  messages: [
    { role: "user", content: "Help me" }
  ],
  system: "You are helpful",
  max_tokens: 500,
  temperature: 0.7
});

console.log(response.content);    // Response text
console.log(response.usage);       // Token usage
console.log(response.stop_reason); // Why it stopped
```

---

## Error Handling

```javascript
try {
  const response = await claude.ask("Test");
} catch (error) {
  if (error.message.includes("not configured")) {
    console.error("Set API key in CONFIG panel");
  } else if (error.message.includes("Network")) {
    console.error("Internet connection issue");
  } else {
    console.error("API error:", error.message);
  }
}
```

---

## Use Cases by Component

### Control Panel
```javascript
// Suggest next move
const suggestion = await claude.ask(
  `Robot status: moving. What next?`,
  "You are a tactical advisor"
);
```

### Script Manager
```javascript
// Generate script from description
const script = await claude.ask(
  "Generate a robot movement sequence for rotating 90 degrees",
  "You understand robot scripting"
);
```

### MEBO Controls
```javascript
// Get strategy advice
const strategy = await claude.ask(
  "Current position: (10,20). Target: (30,50). Best path?",
  "You are a navigation expert"
);
```

---

## From Browser Console

No import needed! Access via global object:

```javascript
// Check status
window.claude_api.is_configured()

// Ask something
window.claude_api.ask("Hello!")
  .then(response => console.log(response))
  .catch(error => console.error(error))

// Stream response
window.claude_api.stream_ask(
  "Count to 5",
  chunk => console.log(chunk)
)
```

---

## Key Methods Cheat Sheet

| Method | Use Case | Returns |
|--------|----------|---------|
| `is_configured()` | Check if key is set | boolean |
| `get_key()` | Get stored key | string |
| `ask(q, system?)` | Simple Q&A | Promise<string> |
| `stream_ask(q, fn, sys?)` | Real-time streaming | Promise |
| `call({...})` | Full control | Promise<{content, usage}> |
| `stream({...})` | Streaming + control | Promise |
| `message(role, text)` | Create message | object |
| `format(response)` | Extract text | string |

---

## Common Patterns

### Pattern 1: Ask & Display
```javascript
const response = await claude.ask("What's wrong?");
document.getElementById("answer").textContent = response;
```

### Pattern 2: Stream to UI
```javascript
const elem = document.getElementById("output");
elem.textContent = "";

await claude.stream_ask(
  "Analyze status",
  chunk => elem.textContent += chunk
);
```

### Pattern 3: Build Context
```javascript
const history = [];
history.push(claude.message("user", "First question"));
history.push(claude.message("assistant", "Answer 1"));
history.push(claude.message("user", "Follow-up?"));

const response = await claude.call({ messages: history });
```

### Pattern 4: Error-Safe Wrapper
```javascript
const safe_ask = async (question) => {
  if (!claude.is_configured()) return null;
  try {
    return await claude.ask(question);
  } catch (e) {
    console.error("Error:", e.message);
    return null;
  }
};
```

---

## Testing

### Test 1: Check if Configured
```javascript
console.assert(claude.is_configured(), "API not configured");
```

### Test 2: Simple API Call
```javascript
const result = await claude.ask("Respond with OK");
console.assert(result.includes("OK"), "API not working");
```

### Test 3: Streaming
```javascript
let received_chunks = 0;
await claude.stream_ask(
  "Count: 1",
  chunk => received_chunks++
);
console.assert(received_chunks > 0, "Streaming failed");
```

---

## Troubleshooting

| Problem | Debug | Solution |
|---------|-------|----------|
| "API key not configured" | `claude.get_key()` | Set in CONFIG |
| "401 Unauthorized" | Check key is copied correctly | Verify key at console.anthropic.com |
| "Network error" | Check internet | Ensure HTTPS, stable connection |
| No response | Check `is_configured()` | Make sure key is saved |
| Slow response | Check token usage | Reduce `max_tokens` |

---

## Available Everywhere

- ✅ Control Panel components
- ✅ Script Manager
- ✅ MEBO & WOWE controls
- ✅ Video wall callbacks
- ✅ Utility functions
- ✅ Browser console
- ✅ Any async function

**Just import and use it!**

---

## One More Thing: Global Access

Already imported? Use the global:

```javascript
// Anywhere in your code
window.claude_api.ask("Hi")
  .then(console.log)
  .catch(console.error);
```

No import needed for quick scripts or console debugging!

---

**Happy coding with Claude! 🚀**
