# MEBO Robot Integration Plan

## Overview
Add Mebo robot support to the existing Wowe web app without changing any existing Wowe functionality. Users will select between "Wowe" and "Mebo" robots, and the UI will switch accordingly.

---

## Understanding

### Current Wowe System
- **Frontend**: Sends commands via `POST /cmd/{cmd}` with `device_id` query param
- **Backend**: Maps UI commands to IR codes, enqueues to IR queue
- **ESP32**: Polls `/ir/next/{device_id}`, receives IR hex codes, transmits via IR
- **Robot**: Wowe RoboSapien receives IR signals

### New Mebo System
- **Frontend**: Will send commands via `POST /cmd/{cmd}` (same endpoint, different commands)
- **Backend**: Maps Mebo UI commands to Arduino character commands ('f', 'r', 's', '5', '6', etc.)
- **ESP32**: Polls `/cmd/next/{device_id}`, receives character commands, sends to Arduino Nano via Serial
- **Robot**: Arduino Nano controls 6 motors based on character commands

### Mebo Motor Commands (from Arduino code)
1. **Movement Motors** (Left/Right):
   - `'f'/'F'` - Forward (both motors forward)
   - `'r'/'R'` - Reverse (both motors reverse)
   - `'s'/'S'` - Stop (both motors stop)
   - `'l'/'L'` - Rotate left (left motor forward only)
   - `'z'/'Z'` - Rotate right (right motor forward only)

2. **Claw Gripper Motor** (JOINT1_M):
   - `'5'` - Claw gripper open
   - `'6'` - Claw gripper close

3. **Rotation Motor** (JOINT_2_M):
   - `'7'` - Rotate object clockwise
   - `'8'` - Rotate object anti-clockwise

4. **Joint 1 Motor** (M1_M):
   - `'9'` - Move object downward
   - `'a'` - Move object upward

5. **Base Joint 2 Motor** (CLAW_GRIPPER):
   - `'b'` - Move object upward
   - `'c'` - Move object downward

6. **Debug**:
   - `'0'` - Print sensor readings

---

## Implementation Plan - FRONTEND UI ONLY

**IMPORTANT:** This implementation focuses ONLY on frontend UI changes. Cameras/video feeds remain completely untouched. Backend changes are minimal (only adding Mebo command routing).

### Phase 1: Backend Changes (Minimal)

#### 1.1 Create Mebo Command Mapping (`backend/utils/mebo_cmd_mapping.py`)
- Map UI-friendly command names to Arduino character commands
- Example mappings:
  - `mebo_forward` → `'f'`
  - `mebo_reverse` → `'r'`
  - `mebo_stop` → `'s'`
  - `mebo_rotate_left` → `'l'`
  - `mebo_rotate_right` → `'z'`
  - `mebo_claw_open` → `'5'`
  - `mebo_claw_close` → `'6'`
  - `mebo_rotate_cw` → `'7'`
  - `mebo_rotate_ccw` → `'8'`
  - `mebo_joint1_down` → `'9'`
  - `mebo_joint1_up` → `'a'`
  - `mebo_joint2_up` → `'b'`
  - `mebo_joint2_down` → `'c'`

#### 1.2 Create Mebo Command Queue (`backend/state/mebo_queue.py`)
- Similar to `ir_queue.py` but stores character commands instead of IR codes
- Structure: `MeboMessage(message_id, device_id, ui_cmd, arduino_cmd, created_at)`
- Functions: `enqueue()`, `pop_next()`, `get_depth()`, `mark_ack_received()`, `wait_for_ack()`

#### 1.3 Create Mebo Routes (`backend/routers/mebo_routes.py`)
- `GET /cmd/next/{device_id}` - ESP32 polls this (returns character command or 204)
- `POST /cmd/ack/{device_id}/{message_id}` - ESP32 sends ACK here
- Response format: plain text character (e.g., "f\n") with headers:
  - `x-wowe-msg-id` (for ACK tracking)
  - `x-wowe-device`
  - `x-wowe-queue-depth`

#### 1.4 Update Command Routes (`backend/routers/cmd_routes.py`)
- Add robot type detection (check if command starts with `mebo_` prefix)
- If Mebo command: route to Mebo queue instead of IR queue
- Keep all existing Wowe commands unchanged

#### 1.5 Update Main App (`backend/app/main.py`)
- Register `mebo_router` alongside existing routers

### Phase 2: Frontend Changes - Game Controller UI (Right Side Tab Only)

#### 2.1 Add Robot Type Selector to Control Panel
- Add selector buttons at the top of control panel content (inside the tab)
- Options: "WOWE" and "MEBO"
- Store selection in state/localStorage
- Position: Above server settings in the control panel
- **DO NOT TOUCH** video wall or camera components (left side remains unchanged)

#### 2.2 Create Mebo Game Controller Component (`src/components/mebo_game_controller.js`)
**IMPORTANT: Must fit in 320-360px wide right panel, scrollable content**

- **Layout Structure:**
  - Keep Backend URL and Robot selector (same as Wowe)
  - Add Robot Type selector (WOWE | MEBO)
  - Compact game controller below

- **Virtual Joystick:**
  - Compact circular joystick base (100px diameter)
  - Draggable stick (40px diameter)
  - Position: Top of game controller section
  - Layout: Horizontal with joystick on left, info text on right
  - Functions: Calculate direction from joystick position
    - Forward: Up direction
    - Reverse: Down direction
    - Left: Left direction
    - Right: Right direction
  - Touch and mouse support

- **Stop Button:**
  - Full-width button (100% of panel width)
  - Red/danger styling
  - Position: Below joystick

- **Action Buttons (Compact Grid):**
  - **Layout:** Vertical stack of action groups
  - **Each Group:** 2-column grid of buttons
  - **Claw Group:**
    - Two buttons: OPEN, CLOSE
    - Orange/Yellow gradient
  - **Rotation Group:**
    - Two buttons: CW, CCW
    - Green gradient
  - **Joint 1 Group:**
    - Two buttons: UP, DOWN
    - Cyan gradient
  - **Joint 2 Group:**
    - Two buttons: UP, DOWN
    - Cyan gradient

#### 2.3 Update Control Panel Content Renderer
- **Keep video wall completely untouched** - no changes to `video_wall.js`
- Modify `render_control_panel_content()` to conditionally render:
  - If WOWE selected: Show original Wowe controls (D-pad, sliders, actions)
  - If MEBO selected: Show Mebo game controller UI
- Game controller fits within the right side tab content area
- Use relative positioning within the card container
- Controls only appear when MEBO is selected in the control panel

#### 2.4 Create Joystick Logic (`src/utils/joystick.js`)
- Handle mouse/touch events for joystick
- Calculate direction and magnitude
- Send movement commands based on joystick position
- Return to center when released

#### 2.5 Update Constants (`src/app/constants.js`)
- Add `ROBOT_TYPES = ["wowe", "mebo"]`
- Add `MEBO_COMMANDS` object with all Mebo command mappings
- Add joystick configuration constants

#### 2.6 Update Bootstrap (`src/app/bootstrap.js`)
- Wire joystick to send movement commands
- Wire all Mebo action buttons to send commands with `mebo_` prefix
- Keep all Wowe event handlers unchanged
- **Ensure video polling/display logic remains untouched**

#### 2.7 Update Control Panel Component (`src/components/control_panel.js`)
- Add robot type selector to `render_control_panel_content()`
- Conditionally render Wowe or Mebo UI based on robot type
- Keep all existing Wowe rendering logic intact
- No changes to app shell or video wall

### Phase 3: Styling - Game Controller Theme

#### 3.1 Add Game Controller Styles (`src/styles/main.css`)
**IMPORTANT: Compact styles for 320-360px panel width**

- **Joystick Styles:**
  - Compact circular base (100px) with glow effect
  - Small draggable stick (40px) with shadow
  - Horizontal layout with info text

- **Button Styles:**
  - Compact buttons (fit 2 per row in 320px width)
  - Minimum padding for touch targets
  - Gradient backgrounds
  - Glow/shadow effects
  - Active/pressed states (scale 0.95)

- **Layout Styles:**
  - Vertical stacking of sections
  - Scrollable content area (uses existing `.card__body` overflow)
  - Compact spacing (12-16px gaps)
  - Full-width stop button

- **Color Scheme:**
  - Movement/Joystick: Cyan (#27d3ff)
  - Actions/Joints: Green (#32ffb7)
  - Claw: Orange/Yellow (#ffb020)
  - Stop: Red (#ff3b3b)

- **Keep all existing Wowe styles unchanged**
- **Keep all video wall styles unchanged**
- **Ensure content is scrollable within panel constraints**

---

## UI Visualization - Game Controller Style (PUBG-like)

### Layout Overview
The Mebo control interface will be overlaid on the video feed area, similar to mobile game controls. The camera/video wall remains untouched on the left side.

### Control Layout (Mebo Mode - Game Controller Style)

```
┌─────────────────────────────────────────────────────────────┐
│  TOPBAR: [WOWE TACTICAL C2]  [Robot: WOWE ▼] [MEBO ▼]     │
├──────────────────────┬──────────────────────────────────────┤
│                      │                                      │
│   VIDEO WALL         │   VIDEO WALL                         │
│   (2x2 Grid)         │   (2x2 Grid)                         │
│   [UNTOUCHED]        │   [UNTOUCHED]                         │
│                      │                                      │
│                      │                                      │
│                      │                                      │
├──────────────────────┴──────────────────────────────────────┤
│                                                              │
│  When MEBO is selected, overlay game controls appear:      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                                                    │    │
│  │  [LEFT JOYSTICK]          [ACTION BUTTONS]         │    │
│  │  (Movement)               (Claw, Joints, etc.)     │    │
│  │                                                    │    │
│  │  [STOP BUTTON]            [ROTATION BUTTONS]      │    │
│  │  (Center/Bottom)          (Top Right)              │    │
│  │                                                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Detailed Control Positions (PUBG-style)

**Left Side - Movement Joystick:**
- Virtual joystick (circular, drag-based)
- Position: Bottom-left corner
- Functions: Forward, Reverse, Left, Right based on joystick direction
- Visual: Semi-transparent circular pad with stick indicator

**Right Side - Action Buttons:**
- **Top Right Corner:**
  - [CLAW OPEN] (large circular button)
  - [CLAW CLOSE] (large circular button)

- **Middle Right:**
  - [JOINT 1 UP] (vertical button)
  - [JOINT 1 DOWN] (vertical button)

- **Bottom Right:**
  - [JOINT 2 UP] (vertical button)
  - [JOINT 2 DOWN] (vertical button)

**Center/Bottom:**
- [STOP] (large, prominent button - red/danger style)

**Top Center:**
- [ROTATE CW] and [ROTATE CCW] (smaller buttons, side by side)

### Visual Style
- **Semi-transparent overlays** - Controls don't block video feed completely
- **Large, touch-friendly buttons** - Easy to press on mobile/desktop
- **Game controller aesthetic** - Rounded buttons, shadows, glow effects
- **Color coding:**
  - Movement: Cyan/Blue
  - Actions: Green
  - Stop: Red
  - Claw: Orange/Yellow
- **Joystick:** Circular pad with drag-to-move functionality
- **Button sizes:** Minimum 60px for touch targets

---

## File Structure Changes

### New Files
```
backend/
  routers/
    mebo_routes.py          # Mebo command polling endpoints
  state/
    mebo_queue.py           # Mebo command queue (similar to ir_queue.py)
  utils/
    mebo_cmd_mapping.py     # UI command → Arduino char mapping

src/
  components/
    mebo_control_panel.js   # Mebo-specific UI rendering
```

### Modified Files
```
backend/
  routers/
    cmd_routes.py           # Add Mebo command routing logic (minimal)

src/
  components/
    app_shell.js           # Add robot type selector to topbar
    control_panel.js       # Keep Wowe controls (no changes to rendering)
  app/
    constants.js            # Add Mebo constants
    bootstrap.js            # Wire Mebo game controller, keep Wowe unchanged
  styles/
    main.css                # Add game controller styles
  utils/
    joystick.js             # NEW: Joystick interaction logic

UNTOUCHED FILES (Cameras/Video):
  src/components/video_wall.js    # NO CHANGES
  backend/routers/video_routes.py # NO CHANGES
  All video-related code           # NO CHANGES
```

---

## Command Flow Comparison

### Wowe Flow
```
UI → POST /cmd/up?device_id=alpha
  → Backend maps "up" → IR code 0x86
  → Enqueues to IR queue
  → ESP32 polls GET /ir/next/alpha
  → Receives "$86\n"
  → Transmits IR signal
  → Wowe robot receives IR
```

### Mebo Flow
```
UI → POST /cmd/mebo_forward?device_id=alpha
  → Backend maps "mebo_forward" → 'f'
  → Enqueues to Mebo queue
  → ESP32 polls GET /cmd/next/alpha
  → Receives "f\n"
  → Sends 'f' to Arduino Nano via Serial
  → Arduino executes motor_drive_call('f')
  → Motors move forward
```

---

## Testing Checklist

- [ ] Robot type selector appears and works
- [ ] Switching to Mebo shows Mebo controls
- [ ] Switching to Wowe shows original Wowe controls
- [ ] Mebo commands send correctly to backend
- [ ] Backend routes Mebo commands to Mebo queue
- [ ] ESP32 can poll `/cmd/next/{device_id}` and receive commands
- [ ] ESP32 can send ACK and backend receives it
- [ ] All 6 motor functions work correctly
- [ ] Wowe functionality remains completely unchanged
- [ ] No UI/UX regressions in Wowe mode

---

## Notes

1. **No Breaking Changes**: All existing Wowe functionality must remain identical
2. **Complete Separation**: WOWE and MEBO are completely isolated systems:
   - **Frontend**: Separate rendering functions (`control_panel.js` vs `mebo_control_panel.js`)
   - **Backend**: Separate routes (`ir_routes.py` vs `mebo_routes.py`)
   - **Queues**: Separate queues (`ir_queue.py` vs `mebo_queue.py`)
   - **Commands**: MEBO uses `mebo_` prefix, WOWE uses no prefix
3. **Cameras Untouched**: Video wall, camera feeds, and all video-related code remain completely unchanged
4. **Command Prefix**: Mebo commands use `mebo_` prefix to distinguish from Wowe commands
5. **Game Controller Style**: UI designed like PUBG/mobile game controls with:
   - Virtual joystick for movement
   - Linear sliders for single-axis controls
   - Compact grid layout (all controls visible)
   - Game-like aesthetic with glows and shadows
6. **Layout**: Controls in right side tab, video wall stays on left (unchanged)
7. **ESP32 Compatibility**: ESP32 code already expects `/cmd/next/{device_id}` endpoint
8. **Device ID**: Both robots can use same device_id system (alpha, bravo, etc.)
9. **State Isolation**: WOWE and MEBO have separate state management (no interference)
10. **Switching Guarantee**: When switching from MEBO to WOWE, WOWE UI and functionality appear exactly as before (no changes)

## Separation Guarantee

See `SEPARATION_GUARANTEE.md` for detailed documentation on how WOWE and MEBO systems are kept completely separate.

---

## Next Steps

1. Review and approve this plan
2. Implement backend changes (Phase 1)
3. Implement frontend changes (Phase 2)
4. Test with actual hardware
5. Refine UI/UX based on testing
