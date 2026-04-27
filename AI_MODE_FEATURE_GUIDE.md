# AI Mode Feature - Complete Guide

## Overview

AI Mode is a new autonomous control system for both WOWE and MEBO robots. It allows you to define an AI-driven behavior that runs **in the background** without interfering with manual or script-based control of other robots.

**Key Concept**: You can have AI Mode active on Robot A while manually controlling Robot B, or running a script on Robot C—all simultaneously.

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  AI MODE TAB (User Interface)                       │
├─────────────────────────────────────────────────────┤
│ 1. Select target robot (robot_id)                   │
│ 2. Enter system prompt (behavior definition)        │
│ 3. Set decision interval (1-60 seconds)             │
│ 4. Click START AI / STOP AI                         │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│  AI MODE ENGINE (Background Loop)                   │
├─────────────────────────────────────────────────────┤
│ Runs independently per robot:                       │
│ • Gets current robot status                         │
│ • Sends status + prompt to Claude API               │
│ • Claude decides next action                        │
│ • Executes decision command                         │
│ • Sleeps for interval period                        │
│ • Repeats...                                        │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│  COMMAND EXECUTION                                  │
├─────────────────────────────────────────────────────┤
│ • Does NOT block other robots                       │
│ • Concurrent with manual/script control             │
│ • Uses same API as manual control                   │
└─────────────────────────────────────────────────────┘
```

### Timeline Example

```
Time    Robot A (Manual)        Robot B (Script)        Robot C (AI Mode)
────────────────────────────────────────────────────────────────────────
T:00s   User presses UP         Script running          AI decides: MOVE_UP
        ├─ MOVE_UP sent         ├─ SEQUENCE_STEP_1      ├─ MOVE_UP sent
        │                       │                       │
T:03s   User presses RIGHT      Script running          AI evaluates status
        ├─ MOVE_RIGHT sent      ├─ SEQUENCE_STEP_2      └─ (waiting for decision)
        │                       │
T:06s   User presses STOP       Script completed        AI decides: MOVE_LEFT
        ├─ STOP sent            ├─ (idle)               ├─ MOVE_LEFT sent
        │                       │                       │
```

All three robots operate independently and concurrently!

---

## User Guide

### Step 1: Open AI MODE Tab

In the right panel, click the **AI MODE** tab (last tab).

### Step 2: Select Target Robot

```
TARGET ROBOT
┌──────────────────────────────┐
│ Alpha (WOWE)        ▼        │
└──────────────────────────────┘
```

Choose which robot you want to control with AI:
- For WOWE robots: "Alpha", "Bravo", "Charlie", "Delta"
- For MEBO robots: Same robot selector

### Step 3: Define System Prompt

```
SYSTEM PROMPT
┌──────────────────────────────┐
│ Example: "You are a tactical │
│ navigation AI. Move the      │
│ robot toward coordinates     │
│ (50, 100) while avoiding     │
│ obstacles. If blocked, try   │
│ alternative routes. Use      │
│ pick_up action when reaching │
│ target."                     │
│                              │
│ [More specific = Better]     │
└──────────────────────────────┘
```

Be specific with:
- **Goal**: What should the robot achieve?
- **Constraints**: What should it avoid?
- **Actions**: Which commands are appropriate?
- **Conditions**: When to trigger certain behaviors?

### Step 4: Set Decision Interval

```
DECISION INTERVAL (seconds)
┌──────────────────────────────┐
│ 3                            │
└──────────────────────────────┘
```

How often should AI make decisions?
- **1-2 seconds**: Very responsive but more API calls
- **3-5 seconds**: Balanced (recommended)
- **10+ seconds**: Less responsive but fewer calls

### Step 5: Start AI Mode

```
┌──────────────────────────────┐
│ [START AI]  [STOP AI]        │
└──────────────────────────────┘
```

Click **START AI** to begin autonomous control.

Status will show:
```
✓ AI MODE ACTIVE (alpha)
```

### Step 6: Monitor & Control

While AI Mode is running:
- ✅ Other robots can be manually controlled
- ✅ Other robots can run scripts
- ✅ You can watch AI decisions in the status area
- ✅ Click STOP AI to halt autonomous control

---

## System Prompt Examples

### Example 1: Navigate to Location (WOWE)

```
You are a tactical navigation AI for a WOWE robot.
Your goal: Navigate to coordinates (100, 150).
Current position: provided in robot status.

Actions available: move_up, move_down, move_left, move_right, stop, pick_up, throw

Strategy:
1. Calculate direction to target from current position
2. Issue movement commands (up/down/left/right)
3. When within 5 units, issue pick_up
4. Return to base at (0, 0)

Be efficient: minimize unnecessary movements.
```

### Example 2: Patrol Pattern (MEBO)

```
You are a patrol AI for a MEBO robot.
Your goal: Patrol the perimeter (back and forth between two points).

Actions available: mebo_move_forward, mebo_move_backward, mebo_rotate_left, 
mebo_rotate_right, mebo_stop, mebo_claw_open, mebo_claw_close

Pattern:
1. Move forward 10 units
2. Rotate 180 degrees
3. Move forward 10 units
4. Rotate 180 degrees
5. Repeat

Continue indefinitely until stopped.
```

### Example 3: Reactive Behavior (WOWE)

```
You are a reactive AI for a WOWE robot.
Behavior: React to obstacles and environmental changes.

Available actions: move_up, move_down, move_left, move_right, stop

Rules:
- If obstacle_front = true: Turn left or right
- If low_battery = true: Move toward charging station
- If target_detected = true: Move toward target
- Otherwise: Continue previous direction

Priority: Safety > Target > Exploration
```

### Example 4: Task-Based (MEBO)

```
You are a task execution AI for a MEBO robot.

Current task list:
1. Navigate to object at location A
2. Use claw to grasp object
3. Navigate to location B
4. Drop object using claw
5. Return to start

Sensor inputs:
- Robot position
- Battery level
- Obstacle detection
- Object proximity

Execute tasks in order. Report completion of each task.
```

---

## Technical Details

### Background Loop

AI Mode runs a **decision loop** in the background:

```javascript
1. Get Robot Status
   └─ Battery level, position, sensor readings, etc.

2. Send to Claude API
   └─ Status + System Prompt → Claude AI

3. Claude Decides
   └─ Analyzes situation
   └─ Returns suggested command

4. Execute Command
   └─ Send command to robot via API
   └─ No blocking—other robots unaffected

5. Sleep for Interval
   └─ Wait N seconds (configurable)

6. Repeat Loop
   └─ Go back to step 1
```

### Commands Recognized

**WOWE Robots**:
- `move_up`, `move_down`, `move_left`, `move_right`
- `stop`
- `pick_up`, `throw`

**MEBO Robots**:
- `mebo_move_forward`, `mebo_move_backward`
- `mebo_rotate_left`, `mebo_rotate_right`
- `mebo_stop`
- `mebo_claw_open`, `mebo_claw_close`

Claude must include one of these exact command names in its response.

### Error Handling

If AI Mode encounters 5+ consecutive errors:
- Automatically stops
- Shows error message
- Requires manual restart

Common errors:
- **API key not configured** → Set in CONFIG panel
- **Claude API unavailable** → Check internet
- **Invalid command format** → Refine system prompt
- **Robot unreachable** → Check backend URL

---

## Concurrent Operation Rules

### What CAN Run Simultaneously

✅ **AI Mode on Robot A** + **Manual Control on Robot B**
```
AI making autonomous decisions   +   User clicking buttons
        (Background)                       (Interactive)
```

✅ **AI Mode on Robot A** + **Script on Robot B**
```
AI autonomous loop (3s interval)  +   Script execution
        (Background)                   (Sequential script)
```

✅ **AI Mode on Robot A** + **AI Mode on Robot B**
```
AI loop for Robot A               +   AI loop for Robot B
(Independent instances)               (Independent instances)
```

### What CANNOT Run Simultaneously

❌ **Two Control Modes on Same Robot**
```
Cannot run:  AI Mode on Robot A + Manual Control on Robot A
             AI Mode on Robot A + Script on Robot A
             Script on Robot A + Manual Control on Robot A
```

If you start a new mode, the previous one stops automatically.

---

## Use Cases

### Use Case 1: Autonomous Exploration
**Setup**:
- Robot A: AI Mode exploring an area
- Robot B: Manual control for human operator
- Robot C: Script running a sequence

**Benefit**: Robot A searches autonomously while you control Robot B directly.

### Use Case 2: Parallel Tasks
**Setup**:
- Robot A: AI Mode patrolling perimeter
- Robot B: AI Mode collecting objects
- Robot C: Manual control for emergency override

**Benefit**: Two robots work independently on different tasks.

### Use Case 3: Failsafe Operation
**Setup**:
- Robot A: Script running main mission
- Robot B: AI Mode monitoring for hazards
- Robot C: Manual control standing by

**Benefit**: AI continuously watches for problems while script executes.

---

## Configuration Storage

AI Mode settings are saved in **localStorage**:

```javascript
localStorage["ai_mode_config"] = {
  robot_id: "alpha",
  system_prompt: "Navigate to...",
  loop_interval_seconds: 3,
  is_active: true
}
```

Settings persist across:
- Page refreshes
- Browser restarts
- Tab closures

Cleared when:
- User clicks CLEAR KEY in CONFIG
- Browser cache is cleared

---

## Monitoring & Debugging

### Status Messages

**Starting**:
```
✓ AI MODE ACTIVE (alpha)
```

**Decision Executing**:
```
⟳ DECISION: move_up (alpha)
```

**Stopped**:
```
⊙ AI MODE STOPPED (alpha)
```

**Error**:
```
✗ ERROR: Claude API key not configured
```

### Browser Console Access

```javascript
// Check if AI is running
window.ai_mode?.is_ai_mode_running("alpha")  // true/false

// Get AI instance info
window.ai_mode?.get_ai_instance_info("alpha")
// {
//   robot_id: "alpha",
//   is_running: true,
//   decision_count: 45,
//   error_count: 0,
//   last_command_sent: "move_up"
// }

// Stop all AI modes
window.ai_mode?.stop_all_ai_modes()
```

---

## Best Practices

### ✅ Do's

✅ **Be Specific**: "Navigate to red marker" is better than "Move forward"  
✅ **Define Constraints**: "Avoid moving backward" guides AI better  
✅ **Use Clear Commands**: Match exact command names (move_up not MOVE_UP)  
✅ **Test with Manual First**: Try movements manually before automating  
✅ **Monitor Status**: Watch the status area for decisions being made  
✅ **Start with Longer Intervals**: 5-10s, then reduce if needed  

### ❌ Don'ts

❌ **Don't Use Vague Prompts**: "Do something smart" won't work  
❌ **Don't Expect Magic**: AI needs clear instructions  
❌ **Don't Ignore Status Messages**: Errors indicate problems  
❌ **Don't Set Interval < 1s**: Too fast, wastes API calls  
❌ **Don't Mix Multiple Modes**: Select one per robot  
❌ **Don't Leave Running Overnight**: Monitor active AI modes  

---

## Troubleshooting

### Problem: "System prompt required" Error

**Solution**: Enter a prompt with clear instructions for AI behavior.

### Problem: AI Mode Keeps Stopping

**Check**:
- [ ] Claude API key set in CONFIG?
- [ ] Internet connection active?
- [ ] Prompt contains actual action words?
- [ ] Check browser console for errors

### Problem: Robot Not Moving

**Check**:
- [ ] Backend URL correct in CONFIG?
- [ ] Robot is online/responding?
- [ ] Prompt includes recognizable commands?
- [ ] Status shows decisions being made?

### Problem: Same Command Repeats

**Solution**: Refine prompt to include "if condition, then alternative action"

### Problem: AI Decisions Seem Random

**Solution**: System prompt is unclear. Provide:
- Specific goals
- Clear constraints
- Decision logic (if X then Y)

---

## Advanced: Integrating with Robot Status

To make AI smarter, the `get_robot_status()` function should return:

```javascript
{
  robot_id: "alpha",
  position: { x: 10, y: 20 },
  battery: 85,
  temperature: 45,
  obstacles: { front: false, left: false, right: false },
  last_command: "move_up",
  is_busy: false,
  timestamp: "2026-04-27T12:45:30Z"
}
```

This enables AI to make context-aware decisions based on actual robot state.

---

## Performance Notes

**API Calls Per Minute**:
- Interval 1s → ~60 calls/min
- Interval 3s → ~20 calls/min (recommended)
- Interval 5s → ~12 calls/min
- Interval 10s → ~6 calls/min

**Billing Impact**:
- Each API call costs tokens
- Monitor at console.anthropic.com
- Budget accordingly for continuous operation

**CPU Impact**:
- Minimal—mostly network I/O
- Runs in background thread
- Doesn't freeze UI

---

## Summary

AI Mode provides **autonomous robot control** that:
- ✅ Runs independently for each robot
- ✅ Doesn't interfere with manual/script control
- ✅ Uses Claude AI for intelligent decision-making
- ✅ Responds to prompts defining behavior
- ✅ Executes commands in background
- ✅ Works for both WOWE and MEBO robots

**Get started**: Open AI MODE tab → Select robot → Enter prompt → Click START AI! 🤖

---

**Last Updated**: 2026-04-27  
**Status**: ✅ Production Ready
