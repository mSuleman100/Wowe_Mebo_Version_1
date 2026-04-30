# Python AI Engine - Implementation Guide

## What Changed? 🔄

**Before (JavaScript):**
- AI engine ran in the frontend browser
- Decision loop tied to webpage (reload = AI stops)
- No persistence between sessions
- Position tracking lived in browser memory

**After (Python):**
- AI engine runs in the FastAPI backend
- AI runs independently of frontend
- Decisions logged to backend
- Can restart without reloading page
- Easy to manage multiple robots
- Production-ready architecture

---

## Architecture 🏗️

```
Frontend (JavaScript/HTML)
├─ UI Controls
├─ Video Display
└─ Calls Backend API to control AI

Backend (Python/FastAPI)
├─ AI Engine (backend/ai/engine.py)
│   ├─ Position tracking
│   ├─ Claude API integration
│   └─ Decision loop
├─ AI State Manager (backend/state/ai_state.py)
│   ├─ Manages multiple robot instances
│   └─ Thread-safe access
└─ AI Routes (backend/routers/ai_routes.py)
    ├─ POST /ai/start
    ├─ POST /ai/stop
    ├─ GET /ai/status/{robot_id}
    ├─ GET /ai/logs/{robot_id}
    └─ GET /ai/instances
```

---

## Files Created 📁

```
backend/
├─ ai/
│   ├─ __init__.py
│   └─ engine.py              ← AI decision loop logic
├─ state/
│   └─ ai_state.py            ← AI instance manager
└─ routers/
    └─ ai_routes.py           ← REST API endpoints
```

---

## How It Works 🚀

### 1. **Start AI Mode**

**Frontend calls:**
```javascript
fetch('/api/ai/start', {
  method: 'POST',
  body: JSON.stringify({
    robot_type: 'mebo',
    robot_id: 'alpha',
    system_prompt: 'Move forward carefully...',
    loop_interval_seconds: 0.5,
    server_origin: 'http://localhost:8002'
  })
})
```

**Backend does:**
1. Create AIInstance with your parameters
2. Start async decision loop
3. Return status

### 2. **AI Loop Runs**

```
Every 0.5 seconds:
├─ Get robot status (position + camera)
├─ Call Claude API with system prompt
├─ Parse Claude's response for commands
├─ Execute command on robot
├─ Update position tracking
└─ Log the decision
```

### 3. **Check Status**

**Frontend calls:**
```javascript
fetch('/api/ai/status/alpha')
```

**Backend returns:**
```json
{
  "robot_id": "alpha",
  "is_running": true,
  "position": {"x": 0.40, "y": 0.00},
  "heading": 90,
  "decision_count": 5,
  "error_count": 0,
  "last_command_sent": "mebo_forward"
}
```

### 4. **Get Logs**

**Frontend calls:**
```javascript
fetch('/api/ai/logs/alpha')
```

**Backend returns:**
```json
[
  {
    "id": 1704067245000,
    "timestamp": "2026-04-30T10:30:45.000Z",
    "robot_id": "alpha",
    "status": "command_executed",
    "command": "mebo_forward",
    "position": {"x": 0.40, "y": 0.00},
    "heading": 0
  },
  ...
]
```

### 5. **Stop AI Mode**

**Frontend calls:**
```javascript
fetch('/api/ai/stop', {
  method: 'POST',
  body: JSON.stringify({ robot_id: 'alpha' })
})
```

---

## Key Benefits ✨

| Feature | Before | After |
|---------|--------|-------|
| **Runs independently** | ❌ Tied to browser | ✅ Independent |
| **Restart AI** | ❌ Reload page | ✅ API call |
| **Multiple robots** | ❌ Complex | ✅ Native |
| **Persistence** | ❌ No | ✅ Logs stored |
| **Production ready** | ❌ No | ✅ Yes |
| **Testable** | ❌ Browser only | ✅ Unit tests |
| **Scalable** | ❌ No | ✅ Yes |

---

## API Reference 📚

### POST /ai/start

**Request:**
```json
{
  "robot_type": "mebo",
  "robot_id": "alpha",
  "system_prompt": "Move forward carefully...",
  "loop_interval_seconds": 0.5,
  "server_origin": "http://localhost:8002"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "robot_id": "alpha",
    "is_running": true,
    "position": {"x": 0, "y": 0},
    "heading": 0,
    "decision_count": 0
  }
}
```

### POST /ai/stop

**Request:**
```json
{
  "robot_id": "alpha"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "robot_id": "alpha",
    "is_running": false,
    "decision_count": 5
  }
}
```

### GET /ai/status/{robot_id}

**Response:**
```json
{
  "success": true,
  "data": {
    "robot_id": "alpha",
    "is_running": true,
    "position": {"x": 0.40, "y": 0.00},
    "heading": 90,
    "decision_count": 5,
    "error_count": 0,
    "last_command_sent": "mebo_forward"
  }
}
```

### GET /ai/logs/{robot_id}

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1704067245000,
      "timestamp": "2026-04-30T10:30:45.000Z",
      "robot_id": "alpha",
      "status": "command_executed",
      "command": "mebo_forward",
      "decision_text": "Executed: mebo_forward | Pos: (0.40, 0.00)",
      "position": {"x": 0.40, "y": 0.00},
      "heading": 0
    }
  ]
}
```

### GET /ai/instances

**Response:**
```json
{
  "success": true,
  "data": {
    "alpha": {
      "robot_id": "alpha",
      "is_running": true,
      "decision_count": 5
    }
  }
}
```

### POST /ai/clear-logs/{robot_id}

**Response:**
```json
{
  "success": true,
  "message": "Logs cleared for alpha"
}
```

---

## Testing the Backend AI 🧪

### 1. **Start AI with curl:**
```bash
curl -X POST http://localhost:8002/ai/start \
  -H "Content-Type: application/json" \
  -d '{
    "robot_type": "mebo",
    "robot_id": "alpha",
    "system_prompt": "Move forward carefully. Check camera for obstacles.",
    "loop_interval_seconds": 0.5,
    "server_origin": "http://localhost:8002"
  }'
```

### 2. **Check status:**
```bash
curl http://localhost:8002/ai/status/alpha
```

### 3. **Get logs:**
```bash
curl http://localhost:8002/ai/logs/alpha
```

### 4. **Stop AI:**
```bash
curl -X POST http://localhost:8002/ai/stop \
  -H "Content-Type: application/json" \
  -d '{"robot_id": "alpha"}'
```

---

## Next Steps 🎯

### Update Frontend (Optional)

The frontend JavaScript AI engine still works, but you can optionally update it to call the backend API instead. This involves:

1. Removing the local AI decision loop from `ai_mode_engine.js`
2. Replacing it with API calls to `/ai/start`, `/ai/stop`, `/ai/logs`
3. Polling `/ai/status` for updates instead of managing state locally

**OR** keep both - frontend AI and backend AI are independent!

---

## Troubleshooting 🔧

### AI won't start
- Check Claude API key is configured: `GET /claude/settings`
- Check `server_origin` is correct
- Check backend logs for errors

### Commands not executing
- Verify robot API endpoints are correct
- Check network connectivity to robot
- Check logs for command parsing errors

### Position tracking seems wrong
- Position resets at startup (expected)
- Check movement history in logs
- Verify command execution on robot

---

## Performance Notes ⚡

- Decision interval: 0.5s minimum (60 max)
- Each decision calls Claude API (~0.5-1s)
- Logs limited to 50 entries per robot (configurable)
- Supports multiple concurrent robot instances
- Thread-safe state management

---

## Production Checklist ✅

- [ ] Configure Claude API key
- [ ] Test with actual robot
- [ ] Set appropriate decision interval
- [ ] Monitor error logs
- [ ] Test multiple robot scenarios
- [ ] Set up logging/monitoring
- [ ] Document system prompts used
- [ ] Create backup/recovery procedures

---

That's it! The Python AI engine is now running on your backend! 🎉
