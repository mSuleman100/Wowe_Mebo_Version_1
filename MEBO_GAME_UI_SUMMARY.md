# Mebo Game Controller UI - Design Summary

## Overview
Redesigned Mebo control interface to match PUBG/game controller style with virtual joystick and action buttons. **Cameras remain completely untouched.**

---

## Key Design Principles

1. **Game Controller Aesthetic**
   - Virtual joystick for movement (like mobile games)
   - Large, touch-friendly buttons
   - Semi-transparent overlays
   - Glow effects and shadows
   - Color-coded controls

2. **Camera Preservation**
   - Video wall on left side: **NO CHANGES**
   - Camera feeds: **NO CHANGES**
   - Video polling: **NO CHANGES**
   - All video-related code: **UNTOUCHED**

3. **Layout Structure**
   ```
   ┌─────────────────────────────────────────┐
   │  TOPBAR: WOWE TACTICAL C2             │
   ├──────────────────┬────────────────────┤
   │                  │  [TABS: CONTROL]   │
   │  VIDEO WALL      │  [TABS: SCRIPT]    │
   │  (Left Side)     ├────────────────────┤
   │  [UNTOUCHED]     │                     │
   │  2x2 Grid        │  [ROBOT TYPE]      │
   │  Always Same     │  WOWE | MEBO       │
   │                  │                     │
   │                  │  [GAME CONTROLS]   │
   │                  │  (In Tab Content)   │
   │                  │  - Joystick         │
   │                  │  - Action Buttons  │
   │                  │  - Stop Button     │
   │                  │                     │
   └──────────────────┴────────────────────┘
   ```

---

## Control Layout (PUBG-style)

### Control Panel Layout (Right Side Tab)

#### Robot Type Selector
- **Position**: Top of control panel content (inside tab)
- **Options**: WOWE | MEBO buttons
- **Function**: Switches between Wowe and Mebo UI

#### Movement Joystick Section
- **Position**: Top of game controller area
- **Size**: 150px diameter base, 60px stick
- **Layout**: Horizontal section with joystick on left, info on right
- **Function**: Drag to move robot
  - Forward: Drag up
  - Reverse: Drag down
  - Left: Drag left
  - Right: Drag right
- **Visual**:
  - Cyan glow effect
  - Semi-transparent base
  - Direction indicators

#### Stop Button Section
- **Position**: Center of game controller
- **Size**: 100px diameter
- **Style**: Large red button with glow
- **Function**: Emergency stop all movement

#### Action Buttons Grid
- **Layout**: 2x2 grid of action groups
- **Groups**:
  1. **Claw Gripper**: OPEN, CLOSE (Orange/Yellow)
  2. **Rotation**: CW, CCW (Green)
  3. **Joint 1**: UP, DOWN (Cyan)
  4. **Joint 2**: UP, DOWN (Cyan)
- **Button Style**: Rectangular buttons with gradients and glows

---

## Visual Design

### Color Scheme
- **Movement/Joystick**: Cyan (#27d3ff) - matches tactical theme
- **Actions/Joints**: Green (#32ffb7) - success/action color
- **Claw**: Orange/Yellow (#ffb020) - warning/attention
- **Stop**: Red (#ff3b3b) - danger/emergency

### Effects
- **Glow Effects**: Buttons have outer glow matching their color
- **Shadows**: Deep shadows for depth
- **Gradients**: All buttons use gradient backgrounds
- **Transparency**: Controls overlay is semi-transparent (doesn't block video)
- **Active States**: Buttons scale down when pressed (0.9-0.95x)

### Button Sizes
- **Minimum Touch Target**: 60px (mobile-friendly)
- **Joystick Base**: 180px
- **Stop Button**: 120px
- **Claw Buttons**: 100px
- **Action Buttons**: 70-80px

---

## Interaction Design

### Joystick
- **Mouse Support**: Click and drag
- **Touch Support**: Touch and drag (mobile)
- **Return to Center**: Automatically returns when released
- **Dead Zone**: Small center area where no command is sent
- **Direction Calculation**: Based on angle from center

### Buttons
- **Click/Touch**: Immediate command send
- **Visual Feedback**: Scale animation on press
- **Hover Effects**: Slight glow increase (desktop)

---

## Implementation Notes

### Files to Create
1. `src/components/mebo_game_controller.js` - Main game controller component
2. `src/utils/joystick.js` - Joystick interaction logic

### Files to Modify
1. `src/components/control_panel.js` - Add robot type selector and conditional rendering
2. `src/app/bootstrap.js` - Wire game controller events
3. `src/app/constants.js` - Add Mebo constants
4. `src/styles/main.css` - Add game controller styles

### Files to NOT Touch
- `src/components/video_wall.js` - **UNTOUCHED**
- `backend/routers/video_routes.py` - **UNTOUCHED**
- All video-related code - **UNTOUCHED**

---

## User Experience Flow

1. **User opens app** → Sees Wowe interface in right side tab (default)
2. **User clicks "MEBO" in control panel** → Game controller UI appears in same tab
3. **User drags joystick** → Robot moves in that direction
4. **User clicks action buttons** → Robot performs actions (claw, joints, etc.)
5. **User clicks "WOWE"** → Returns to original Wowe controls in same tab
6. **Video feeds continue working** → Always visible on left side, never blocked
7. **Tabs work normally** → Can switch between CONTROL PANEL and SCRIPT tabs

---

## Responsive Considerations

- **Desktop**: Full-size controls, mouse interaction
- **Tablet**: Touch-optimized, larger buttons
- **Mobile**: Same layout, touch-friendly sizes
- **Video**: Always visible, scales with screen size

---

## Testing Checklist

- [ ] Robot type selector works in topbar
- [ ] Switching to MEBO shows game controller
- [ ] Switching to WOWE shows original controls
- [ ] Joystick responds to mouse drag
- [ ] Joystick responds to touch drag
- [ ] All action buttons work
- [ ] Stop button works
- [ ] Video feeds remain visible and functional
- [ ] No interference with camera display
- [ ] Controls are semi-transparent (video visible behind)
- [ ] Wowe functionality completely unchanged

---

## Next Steps

1. Review `MEBO_GAME_CONTROLLER_UI.html` in browser to see visual design
2. Approve the game controller layout
3. Implement frontend components
4. Test with actual hardware
5. Refine based on user feedback
