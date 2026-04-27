# Claude API Architecture

## System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     WOWE TACTICAL C2 APP                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                     UI COMPONENTS                          │   │
│  ├────────────────────────────────────────────────────────────┤   │
│  │  • Control Panel          • Script Manager                 │   │
│  │  • MEBO Controls          • Custom Components              │   │
│  │  • Video Wall             • Browser Console                │   │
│  └────┬─────────────────────────────────┬─────────────────────┘   │
│       │                                 │                          │
│       └──────────┬──────────────────────┘                          │
│                  │                                                 │
│  ┌───────────────▼──────────────────────────────────────────────┐ │
│  │              CLAUDE GLOBAL UTILITY                          │ │
│  │          (src/utils/claude.js)                              │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │                                                              │ │
│  │  • claude.ask(q, sys)                                       │ │
│  │  • claude.stream_ask(q, fn, sys)                            │ │
│  │  • claude.call({...})                                       │ │
│  │  • claude.is_configured()                                   │ │
│  │  • window.claude_api ←─── Global Access                     │ │
│  │                                                              │ │
│  └───────────────┬──────────────────────────────────────────────┘ │
│                  │                                                 │
│  ┌───────────────▼──────────────────────────────────────────────┐ │
│  │         CLAUDE API MODULE                                   │ │
│  │     (src/api/claude_api.js)                                 │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │                                                              │ │
│  │  • call_claude_api({...})                                   │ │
│  │  • call_claude_api_streaming({...})                         │ │
│  │  • get_claude_api_key()                                     │ │
│  │  • is_claude_api_configured()                               │ │
│  │  • create_message(role, content)                            │ │
│  │  • format_claude_response(res)                              │ │
│  │                                                              │ │
│  └───────────────┬──────────────────────────────────────────────┘ │
│                  │                                                 │
│  ┌───────────────▼──────────────────────────────────────────────┐ │
│  │          CONFIG PANEL & STORAGE                             │ │
│  │     (src/components/config_panel.js)                        │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │                                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐   │ │
│  │  │  CONFIG Tab                                          │   │ │
│  │  ├──────────────────────────────────────────────────────┤   │ │
│  │  │  API Key Input [••••••••••••]                        │   │ │
│  │  │  [SAVE KEY]  [CLEAR KEY]                             │   │ │
│  │  │  Status: ✓ API Key Saved                             │   │ │
│  │  └──────────────────────────────────────────────────────┘   │ │
│  │                        ↓                                     │ │
│  │  localStorage["claude_api_key"] = "sk-..."                  │ │
│  │                                                              │ │
│  └───────────────┬──────────────────────────────────────────────┘ │
│                  │                                                 │
│                  │ (Secure, Browser-Local)                        │
│                  │                                                 │
└──────────────────┼─────────────────────────────────────────────────┘
                   │
                   │ HTTPS Only
                   │
        ┌──────────▼──────────┐
        │  ANTHROPIC API      │
        │  https://api        │
        │  .anthropic.com     │
        │                     │
        │  • Authentication   │
        │  • Message Process  │
        │  • Response Stream  │
        │                     │
        └─────────────────────┘
```

---

## Data Flow: Ask a Question

```
Component Code:
  const response = await claude.ask("What's next?")
  
                    ↓
                    
Utility Layer (claude.js):
  • Calls get_claude_api_key()
  • Creates message: {role: "user", content: "..."}
  • Calls call_claude_api({messages, system?})
  
                    ↓
                    
API Layer (claude_api.js):
  • Retrieves key: sk-proj-...
  • Validates key exists
  • Builds HTTP request:
    - Headers: x-api-key, Content-Type
    - Body: {model, messages, max_tokens}
  • Sends to https://api.anthropic.com/v1/messages
  
                    ↓
                    
Anthropic API:
  • Authenticates with API key
  • Processes request
  • Generates response with Claude
  • Returns: {content, stop_reason, usage}
  
                    ↓
                    
API Layer (claude_api.js):
  • Parses response JSON
  • Extracts content text
  • Returns {content, stop_reason, usage}
  
                    ↓
                    
Utility Layer (claude.js):
  • Returns response.content (text only)
  
                    ↓
                    
Component Code:
  console.log(response)  // "Here's what's next..."
```

---

## Data Flow: Stream Response

```
Component Code:
  await claude.stream_ask("Analyze", 
    chunk => updateUI(chunk))
  
                    ↓
                    
Utility Layer (claude.js):
  • Creates message
  • Calls call_claude_api_streaming({
      messages, on_chunk, system?
    })
  
                    ↓
                    
API Layer (claude_api.js):
  • Retrieves API key
  • Sets stream: true in request
  • Opens HTTP streaming connection
  • Receives Server-Sent Events (SSE)
  
                    ↓
                    
Anthropic API (Streaming):
  └─ data: {type: "message_start", ...}
  └─ data: {type: "content_block_delta", delta: {text: "The"}}
  └─ data: {type: "content_block_delta", delta: {text: " robot"}}
  └─ data: {type: "content_block_delta", delta: {text: " is..."}}
  └─ data: [DONE]
  
                    ↓
                    
API Layer (claude_api.js):
  For each SSE event:
    • Parse JSON
    • Extract delta.text
    • Call on_chunk(text)
  
                    ↓
                    
Component Callback:
  updateUI("The")        // UI updates with "The"
  updateUI(" robot")     // UI updates with "The robot"
  updateUI(" is...")     // UI updates with "The robot is..."
```

---

## Configuration State Machine

```
  START
    ↓
    └─→ [No API Key Set]
        │ User opens CONFIG tab
        │ Enters API key
        │ Clicks SAVE
        └─→ key stored in localStorage
            Status: ✓ API Key Saved
            
            ↓
            
        [API Key Configured]
        │
        ├─→ Any component imports claude
        │   is_configured() returns true
        │   call_claude_api() works ✓
        │   
        └─→ User clicks CLEAR KEY
            localStorage cleared
            Status: ✓ API Key Cleared
            
            ↓ (back to no key state)
```

---

## Module Dependencies

```
bootstrap.js (MAIN)
  ├─→ config_panel.js
  │   ├─→ load_claude_api_key()
  │   ├─→ save_claude_api_key()
  │   └─→ clear_claude_api_key()
  │
  ├─→ utils/claude.js (GLOBAL UTILITY)
  │   ├─→ api/claude_api.js
  │   │   ├─→ config_panel.js (get key)
  │   │   └─→ Anthropic API
  │   │
  │   └─→ window.claude_api (exposed)
  │
  └─→ Other components can:
      ├─→ import { claude } from utils/claude.js
      └─→ Use window.claude_api (globally)
```

---

## File Structure

```
src/
├── api/
│   └── claude_api.js              ← Low-level API calls
├── components/
│   ├── config_panel.js            ← CONFIG panel UI
│   ├── control_panel.js           ← Contains CONFIG tab
│   └── ...
├── utils/
│   ├── claude.js                  ← GLOBAL UTILITY
│   ├── dom.js
│   └── ...
├── styles/
│   └── main.css                   ← CONFIG panel styles
├── app/
│   └── bootstrap.js               ← Initialize claude
└── ...
```

---

## Call Stack Example

```
User clicks "Ask Claude"
    ↓
Component calls: claude.ask("Hello")
    ↓
utils/claude.js: call_claude_api({messages: [...]})
    ↓
api/claude_api.js: 
    • get_claude_api_key() → "sk-proj-..."
    • fetch(ANTHROPIC_API, {
        method: POST
        headers: {x-api-key: "sk-proj-..."}
        body: {model, messages}
      })
    ↓
Anthropic processes request
    ↓
Response received: {content: "...", usage: {...}}
    ↓
Returned to Component
    ↓
Component displays: response
```

---

## Error Handling Flow

```
Component: await claude.ask("test")
    ↓
No API key configured?
    ├─→ Throw: "Claude API key not configured"
    └─→ Catch in component, handle error
    
API key exists?
    ├─→ Send HTTPS request
    │   ├─→ Network error?
    │   │   └─→ Throw: "Network error..."
    │   │
    │   ├─→ Response not ok?
    │   │   └─→ Throw: "API Error: 401 Unauthorized"
    │   │
    │   └─→ Response OK?
    │       └─→ Parse JSON
    │           ├─→ No content?
    │           │   └─→ Return empty string
    │           └─→ Has content?
    │               └─→ Return: {content, usage}
    │
    └─→ Return to component
```

---

## Authentication Flow

```
Component requests:
  const response = await claude.ask("...")
  
        ↓
        
API constructs request:
{
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "sk-proj-abc123xyz...",  ← From CONFIG
    "anthropic-version": "2023-06-01"
  },
  body: {
    model: "claude-opus-4-7",
    messages: [{role: "user", content: "..."}],
    max_tokens: 1024
  }
}

        ↓
        
Sent to: https://api.anthropic.com/v1/messages

        ↓
        
Anthropic validates:
  • HTTPS? ✓
  • Header x-api-key valid? ✓
  • Key active? ✓
  
        ↓
        
Response: {content, usage, stop_reason}
```

---

## Availability by Robot Type

```
WOWE Robot:
  ├─→ Control Panel available ✓
  ├─→ Script Manager available ✓
  ├─→ CONFIG tab available ✓
  └─→ Claude API available ✓

MEBO Robot:
  ├─→ Control Panel available ✓
  ├─→ Script Manager hidden ✗
  ├─→ CONFIG tab available ✓
  └─→ Claude API available ✓
```

---

## Browser Console Access

```
User opens DevTools Console
    ↓
window.claude_api available globally
    ↓
Can call directly:
  • window.claude_api.is_configured()
  • window.claude_api.ask("test")
  • window.claude_api.get_key()
  • window.claude_api.stream_ask(...)
  
        ↓
        
No import needed!
Result appears in console immediately
```

---

## Performance Characteristics

```
API Call Time:
  Network latency: ~100-500ms
  Claude processing: ~500-2000ms (varies)
  Total: ~600-2500ms

Streaming:
  First chunk: ~500-1000ms
  Subsequent chunks: ~50-200ms per chunk
  Total: ~1-5 seconds

Storage (localStorage):
  API Key: ~50-100 bytes
  No impact on app performance
```

---

## Security Boundaries

```
┌─────────────────────────────────────────────┐
│           BROWSER (SECURE)                  │
│                                             │
│  ┌────────────────────────────────────────┐ │
│  │ APP CODE                               │ │
│  │ ├─ Claude API utility                  │ │
│  │ └─ CONFIG panel                        │ │
│  │                                        │ │
│  │ localStorage (browser-only)            │ │
│  │ └─ "claude_api_key": "sk-..."         │ │
│  └────────────────────────────────────────┘ │
│             ↑ (HTTPS encrypted)             │
└─────────────┼──────────────────────────────┘
              │
        ┌─────▼──────┐
        │ ANTHROPIC  │
        │ API        │
        │            │
        │ Validates  │
        │ key        │
        └────────────┘

NEVER exposed to:
  ✗ Backend server
  ✗ Third-party services
  ✗ Analytics
  ✗ Local files
```

---

## Initialization Sequence

```
1. User loads app (index.html)
2. bootstrap.js executes
3. Import claude utility
4. Initialize app components
5. Expose window.claude_api
6. Log status to console:
   ├─ "✓ API key configured" (if key exists)
   └─ "⚠ No API key set" (if no key)
7. App ready
8. Components can use claude
```

---

**Architecture is clean, modular, and production-ready! 🚀**
