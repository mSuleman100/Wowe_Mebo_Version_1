# AI Mode Guide - MEBO Position Tracking

## How It Works Now ✨

Your MEBO robot **doesn't have an onboard position sensor**, so the web app now **tracks position locally**:

### Position Tracking System

```
Starting Position: (0, 0) at North (0°)
       ↑
       N (0°)
W(270°) ← → E (90°)
       S (180°)
       ↓

Every command updates position:
  mebo_forward  → Move 40cm forward (in current heading)
  mebo_reverse  → Move 40cm backward (opposite heading)
  mebo_rotate_right → Turn 90° clockwise (East)
  mebo_rotate_left  → Turn 90° counter-clockwise (West)
```

### Example Movement Path:

```
Step 1: START at (0, 0) facing North
        Position: (0.00, 0.00) Heading: North (0°)

Step 2: mebo_forward
        Position: (0.00, 0.40) Heading: North (0°)

Step 3: mebo_rotate_right
        Position: (0.00, 0.40) Heading: East (90°)

Step 4: mebo_forward
        Position: (0.40, 0.40) Heading: East (90°)

Step 5: mebo_rotate_right
        Position: (0.40, 0.40) Heading: South (180°)

Step 6: mebo_forward
        Position: (0.40, 0.00) Heading: South (180°)
```

---

## System Prompt Examples 🎯

### Example 1: Simple Exploration (Safe)
```
Explore the area carefully by moving forward.
When you see a wall or obstacle in the camera feed, stop and rotate left.
Move forward again when the path is clear.
Repeat this pattern to map the environment.
```

**How it works:**
- AI sees camera feed
- If no obstacle: sends `mebo_forward` (40cm)
- If obstacle detected: sends `mebo_rotate_left` (90° turn)
- Then continues exploring

---

### Example 2: Object Search & Grab
```
Your mission: Find and pickup objects using the claw.
1. Move forward to search for targets
2. When you see an object in the camera, position yourself
3. Use mebo_claw_open to open the claw
4. Move closer with mebo_forward
5. Use mebo_claw_close to grab the object
6. Continue searching for more objects

Be deliberate and verify each movement.
```

**Expected behavior:**
- Moves around looking for objects
- When it sees something, opens claw
- Approaches and grabs
- Logs each action with position

---

### Example 3: Wall Following (Mapping)
```
Follow the left wall to map the space.
Keep the wall on your left side while moving forward.
When path ahead is blocked, rotate right.
When you detect open space to your left, rotate left.
This creates a systematic exploration pattern.
```

**Position tracking shows:**
```
(0,0) → (0,0.4) → (0,0.8) → rotate right → (0.4,0.8) → etc.
```

---

### Example 4: Obstacle Avoidance (Smart Navigation)
```
Navigate carefully through the environment.
Priority rules (in order):
1. If obstacle directly ahead: rotate left, try again
2. If path clear ahead: move forward
3. Every 3 movements, rotate right to explore new directions
4. Use mebo_stop if completely blocked (all sides)

Track your position mentally - avoid revisiting the same spot twice.
```

---

### Example 5: Claw Operation Training
```
Practice precise arm control:
1. Move forward slowly using mebo_forward
2. Every 2 moves: open claw with mebo_claw_open
3. Then: close claw with mebo_claw_close
4. Repeat while rotating to access different angles

This teaches the AI how long movement takes vs claw operation.
```

---

## What the AI Sees in Status Report 📊

Each iteration, Claude receives:

```
Robot ID: alpha
Estimated Position: X=0.40m, Y=0.80m
Heading: East (90°)
Recent Moves: mebo_forward → mebo_rotate_right → mebo_forward
Timestamp: 2026-04-30T10:30:45.123Z

INSTRUCTIONS:
- Use mebo_forward (40cm) or mebo_reverse (40cm) to move
- Use mebo_rotate_left or mebo_rotate_right (90° per rotation)
- Always use mebo_stop to halt
- Analyze the camera feed for obstacles and targets
```

Plus: **Camera feed image** (for vision analysis)

---

## Important Notes ⚠️

1. **Position is cumulative** - errors add up over many commands
2. **Camera feed is reliable** - use it for obstacle detection
3. **Heading is 0°-360°** - tracked with each rotation
4. **Recent move history** - shown so AI knows what it just did
5. **No feedback from robot** - all tracking is app-side (this is by design for MEBO)

---

## Tips for Writing Good System Prompts 💡

✓ **DO:**
- Describe behavior in terms of what AI should DO
- Reference camera feed analysis
- Use timing awareness ("after 2 moves, do X")
- Be clear about goals

✗ **DON'T:**
- Ask for robot's current speed (MEBO doesn't report it)
- Expect exact position matching (tracking can drift)
- Use commands not in available list
- Ask robot to "remember" things between runs (no persistence)

---

## Testing Your Prompts 🧪

1. Write your prompt in "SYSTEM PROMPT" field
2. Set interval to **0.5-1 second** (shorter = faster decisions)
3. Click "START AI"
4. Watch "AI LOGS" panel to see:
   - Decisions Claude made
   - Commands executed
   - Position updates
5. Adjust prompt based on behavior

---

## Command Timing Reference ⏱️

```
Command                Duration    Effect
─────────────────────────────────────────
mebo_forward           ~0.5s       +40cm forward
mebo_reverse           ~0.5s       +40cm backward
mebo_rotate_left       ~1s         +90° counter-clockwise
mebo_rotate_right      ~1s         +90° clockwise
mebo_rotate_cw         ~1s         +90° clockwise
mebo_rotate_ccw        ~1s         +90° counter-clockwise
mebo_claw_open         ~0.3s       Opens gripper
mebo_claw_close        ~0.3s       Closes gripper
mebo_joint1_up/down    ~0.5s       Moves arm joint
mebo_joint2_up/down    ~0.5s       Moves arm joint
mebo_stop              instant     Halts robot
```

---

## Debug Position Tracking

Check **AI LOGS** panel to see:
```
Executed: mebo_forward | Pos: (0.00, 0.40)
Executed: mebo_rotate_right | Pos: (0.00, 0.40)
Executed: mebo_forward | Pos: (0.40, 0.40)
```

This shows that position is being calculated correctly! 🎉
