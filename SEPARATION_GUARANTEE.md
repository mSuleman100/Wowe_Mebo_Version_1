# WOWE and MEBO Separation Guarantee

## Overview

This document ensures complete separation between WOWE and MEBO systems. When switching between robot types, WOWE functionality and UI remain completely unchanged.

---

## Frontend Separation Strategy

### 1. Separate Rendering Functions

#### Current Structure (WOWE - UNTOUCHED)

```javascript
// src/components/control_panel.js
export const render_control_panel_content = () => {
  // Original WOWE rendering - NO CHANGES
  const wrap = el({ tag: "div", class_name: "control" });
  wrap.append(
    render_server_settings(),
    render_robot_selector(),
    render_dpad(), // WOWE D-pad
    render_sliders(), // WOWE sliders
    render_actions(), // WOWE actions
  );
  return render_card({ title: "CONTROL PANEL", body: wrap });
};
```

#### New Structure (MEBO - SEPARATE)

```javascript
// src/components/mebo_control_panel.js (NEW FILE)
export const render_mebo_control_panel_content = () => {
  // Completely separate MEBO rendering
  const wrap = el({ tag: "div", class_name: "control" });
  wrap.append(
    render_server_settings(), // Shared (no robot-specific logic)
    render_robot_type_selector(), // NEW: WOWE/MEBO selector
    render_robot_selector(), // Shared (device selection)
    render_mebo_game_controller(), // NEW: MEBO game controller
  );
  return render_card({
    title: "CONTROL PANEL",
    subtitle: "[MEBO]",
    body: wrap,
  });
};
```

### 2. Conditional Rendering in Bootstrap

#### Implementation Pattern

```javascript
// src/app/bootstrap.js

// Add robot type state (separate from WOWE state)
const robot_type_ref = create_ref(
  localStorage.getItem("robot_type") || "wowe"
);

// Store robot type selection
const save_robot_type = (type) => {
  robot_type_ref.set(type);
  localStorage.setItem("robot_type", type);
};

// Modified switch_right_tab function
const switch_right_tab = (tab_name) => {
  if (tab_name === "control") {
    const robot_type = robot_type_ref.get();
    const tab_content = document.getElementById("tab-content");

    if (robot_type === "mebo") {
      // Render MEBO controls
      tab_content.replaceChildren(render_mebo_control_panel_content());
      bind_mebo_controls({ server_origin_ref, robot_ref });
    } else {
      // Render WOWE controls (ORIGINAL - NO CHANGES)
      tab_content.replaceChildren(render_control_panel_content());
      // Original WOWE bindings (NO CHANGES)
      bind_server_settings({ server_origin_ref, ... });
      bind_motion_buttons({ server_origin_ref, robot_ref });
      bind_keyboard_motion({ server_origin_ref, robot_ref });
      bind_actions({ server_origin_ref, robot_ref, seq_state });
      bind_sequence_editor({ server_origin_ref, seq_state });
    }
  }
  // ... rest of tab switching logic
};
```

### 3. Separate Event Handlers

#### WOWE Handlers (UNTOUCHED)

```javascript
// src/app/bootstrap.js - Existing functions remain unchanged
const bind_motion_buttons = ({ server_origin_ref, robot_ref }) => {
  // Original WOWE motion button handlers
  // NO CHANGES
};

const bind_actions = ({ server_origin_ref, robot_ref, seq_state }) => {
  // Original WOWE action handlers
  // NO CHANGES
};
```

#### MEBO Handlers (NEW - SEPARATE)

```javascript
// src/app/bootstrap.js - New functions
const bind_mebo_controls = ({ server_origin_ref, robot_ref }) => {
  // MEBO-specific event handlers
  // - Joystick handlers
  // - Slider handlers
  // - Stop button handler
  // Completely separate from WOWE handlers
};
```

### 4. State Management Separation

#### WOWE State (UNTOUCHED)

- `seq_state` - Sequence editor state (WOWE only)
- `robot_ref` - Device selection (shared, but commands differ)
- `server_origin_ref` - Backend URL (shared)

#### MEBO State (NEW - SEPARATE)

- `robot_type_ref` - Robot type selection (WOWE/MEBO)
- No interference with WOWE state
- Separate command queue on backend

---

## Backend Separation Strategy

### 1. Separate Command Queues

#### WOWE Queue (EXISTING - UNTOUCHED)

```python
# backend/state/ir_queue.py - NO CHANGES
# Handles IR codes for WOWE robot
# Structure: IrMessage(message_id, device_id, ui_cmd, ir_code, created_at)
```

#### MEBO Queue (NEW - SEPARATE)

```python
# backend/state/mebo_queue.py - NEW FILE
# Handles Arduino character commands for MEBO robot
# Structure: MeboMessage(message_id, device_id, ui_cmd, arduino_cmd, created_at)
# Completely separate queue system
```

### 2. Separate Routes

#### WOWE Routes (EXISTING - UNTOUCHED)

```python
# backend/routers/ir_routes.py - NO CHANGES
# GET /ir/next/{device_id} - WOWE ESP32 polls this
# POST /ir/ack/{device_id}/{message_id} - WOWE ESP32 ACK
```

#### MEBO Routes (NEW - SEPARATE)

```python
# backend/routers/mebo_routes.py - NEW FILE
# GET /cmd/next/{device_id} - MEBO ESP32 polls this
# POST /cmd/ack/{device_id}/{message_id} - MEBO ESP32 ACK
# Completely separate endpoint paths
```

### 3. Command Routing Logic

#### Command Detection

```python
# backend/routers/cmd_routes.py

@router.post("/cmd/{cmd}", response_model=CommandResponse)
def post_cmd(cmd: str, device_id: str = Query(...)) -> CommandResponse:
    """Route commands to appropriate queue based on prefix."""

    # Check if MEBO command (starts with 'mebo_')
    if cmd.startswith("mebo_"):
        # Route to MEBO queue
        from backend.utils.mebo_cmd_mapping import try_get_arduino_cmd
        from backend.state.mebo_queue import enqueue as mebo_enqueue

        arduino_cmd = try_get_arduino_cmd(ui_cmd=cmd)
        if arduino_cmd is not None:
            mebo_enqueue(device_id=device_id, ui_cmd=cmd, arduino_cmd=arduino_cmd)
        return CommandResponse(is_ok=True, cmd=cmd)

    # Otherwise, route to WOWE queue (ORIGINAL LOGIC - NO CHANGES)
    from backend.state.ir_queue import enqueue
    from backend.utils.cmd_mapping import try_get_ir_code

    ir_code = try_get_ir_code(ui_cmd=cmd)
    if ir_code is not None:
        enqueue(device_id=device_id, ui_cmd=cmd, ir_code=ir_code)

    return CommandResponse(is_ok=True, cmd=cmd)
```

### 4. Separate Command Mappings

#### WOWE Mapping (EXISTING - UNTOUCHED)

```python
# backend/utils/cmd_mapping.py - NO CHANGES
UI_TO_IR: dict[str, int] = {
    "up": 0x86,
    "down": 0x87,
    # ... existing WOWE mappings
}
```

#### MEBO Mapping (NEW - SEPARATE)

```python
# backend/utils/mebo_cmd_mapping.py - NEW FILE
UI_TO_ARDUINO: dict[str, str] = {
    "mebo_forward": "f",
    "mebo_reverse": "r",
    "mebo_stop": "s",
    # ... MEBO mappings
}
```

---

## File Structure - Complete Separation

### Frontend Files

#### WOWE Files (UNTOUCHED)

- `src/components/control_panel.js` - NO CHANGES
- `src/app/bootstrap.js` - MINIMAL CHANGES (only add conditional rendering)
- `src/styles/main.css` - Add MEBO styles, keep WOWE styles unchanged

#### MEBO Files (NEW)

- `src/components/mebo_control_panel.js` - NEW: MEBO UI rendering
- `src/utils/joystick.js` - NEW: Joystick interaction logic
- `src/app/constants.js` - Add MEBO constants (keep WOWE constants)

### Backend Files

#### WOWE Files (UNTOUCHED)

- `backend/routers/ir_routes.py` - NO CHANGES
- `backend/state/ir_queue.py` - NO CHANGES
- `backend/utils/cmd_mapping.py` - NO CHANGES
- `backend/routers/cmd_routes.py` - MINIMAL CHANGES (only add routing logic)

#### MEBO Files (NEW)

- `backend/routers/mebo_routes.py` - NEW: MEBO endpoints
- `backend/state/mebo_queue.py` - NEW: MEBO queue system
- `backend/utils/mebo_cmd_mapping.py` - NEW: MEBO command mapping

---

## Guarantee Checklist

### Frontend Separation ✅

- [ ] WOWE rendering function remains completely unchanged
- [ ] MEBO rendering in separate file (`mebo_control_panel.js`)
- [ ] Conditional rendering based on robot type
- [ ] WOWE event handlers remain unchanged
- [ ] MEBO event handlers in separate functions
- [ ] No shared state between WOWE and MEBO (except device_id, server_origin)
- [ ] WOWE styles remain unchanged
- [ ] MEBO styles in separate CSS classes

### Backend Separation ✅

- [ ] WOWE IR queue remains unchanged
- [ ] MEBO queue in separate file (`mebo_queue.py`)
- [ ] WOWE routes remain unchanged (`/ir/next/{device_id}`)
- [ ] MEBO routes in separate file (`/cmd/next/{device_id}`)
- [ ] WOWE command mapping remains unchanged
- [ ] MEBO command mapping in separate file
- [ ] Command routing logic checks prefix before routing
- [ ] No shared state between WOWE and MEBO queues

### Testing Checklist ✅

- [ ] Switch to WOWE → Original UI appears
- [ ] Switch to MEBO → Game controller UI appears
- [ ] Switch back to WOWE → Original UI appears (no changes)
- [ ] WOWE commands work exactly as before
- [ ] MEBO commands work independently
- [ ] No interference between WOWE and MEBO commands
- [ ] Video feeds remain unchanged (always visible)
- [ ] Camera functionality unaffected

---

## Implementation Notes

### Key Principles

1. **Zero Breaking Changes**: All WOWE code remains exactly as is
2. **Complete Isolation**: WOWE and MEBO have separate code paths
3. **Prefix-Based Routing**: Commands prefixed with `mebo_` go to MEBO system
4. **Separate Queues**: WOWE uses IR queue, MEBO uses Mebo queue
5. **Conditional Rendering**: Frontend switches UI based on robot type selection

### Safety Measures

- WOWE rendering function is never modified
- WOWE event handlers are never modified
- WOWE backend routes are never modified
- MEBO uses completely separate files and functions
- Command prefix (`mebo_`) ensures proper routing
- Separate queues prevent command interference

---

## Summary

**WOWE System:**

- Frontend: `control_panel.js` (unchanged)
- Backend: `ir_routes.py`, `ir_queue.py` (unchanged)
- Commands: No prefix (e.g., "up", "down", "pick_up")
- Endpoint: `/ir/next/{device_id}`

**MEBO System:**

- Frontend: `mebo_control_panel.js` (new)
- Backend: `mebo_routes.py`, `mebo_queue.py` (new)
- Commands: `mebo_` prefix (e.g., "mebo_forward", "mebo_claw_open")
- Endpoint: `/cmd/next/{device_id}`

**Separation Guarantee:**

- ✅ Complete code isolation
- ✅ Separate state management
- ✅ Independent command queues
- ✅ No shared logic between systems
- ✅ WOWE remains 100% unchanged
