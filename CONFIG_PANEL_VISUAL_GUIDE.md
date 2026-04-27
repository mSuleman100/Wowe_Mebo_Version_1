# CONFIG Panel - Visual Guide

## Tab Navigation

```
┌─────────────────────────────────────────────────────┐
│  [CONTROL PANEL]  [SCRIPT]  [CONFIG]                │
└─────────────────────────────────────────────────────┘
```

When you click the **CONFIG** tab, the right panel transforms to show:

## CONFIG Panel Layout

```
┌──────────────────────────────────────────────────────────┐
│ CONFIG                                            SETTINGS │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  Claude API Key                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ••••••••••••••••••••••••••••••••••••••••••••••••••••  │ │
│  └──────────────────────────────────────────────────────┘ │
│  Get your API key from https://console.anthropic.com/     │
│                                                            │
│  ┌─────────────────────┬──────────────────────────────┐   │
│  │   SAVE KEY          │     CLEAR KEY                │   │
│  └─────────────────────┴──────────────────────────────┘   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │           ✓ API Key Saved                            │ │
│  └──────────────────────────────────────────────────────┘ │
│  (auto-dismisses after 3 seconds)                          │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

## Color Scheme

**Header & Title**
- Title text: Bright cyan (`#27d3ff`)
- Subtitle: Cyan with opacity
- Border: Subtle cyan lines

**Input Field**
- Border: Dark gray with subtle cyan glow on focus
- Background: Very dark blue semi-transparent
- Text: Bright white for contrast
- **Type**: Password (masked display) for security

**Buttons**
- **SAVE KEY**: Cyan primary button
  - Border: Cyan
  - Hover: Lighter cyan background
  - Click: Smooth press animation

- **CLEAR KEY**: Amber secondary button
  - Border: Orange/amber
  - Hover: Lighter amber background
  - Click: Smooth press animation

**Status Messages**
- **Success**: Lime green background + green border
  - Text: "✓ API Key Saved" or "✓ API Key Cleared"
  - Duration: 3 seconds auto-dismiss

- **Error**: Red background + red border
  - Text: "API key cannot be empty" or "Failed to save API key"
  - Duration: Stays until resolved

## User Flow

### Step 1: Click CONFIG Tab
```
┌──────────────────────────────────────────┐
│  [CONTROL PANEL]  [SCRIPT]  [CONFIG] ←───│ Click here
└──────────────────────────────────────────┘
```

### Step 2: Enter API Key
```
┌─────────────────────────────────────────┐
│ Claude API Key                            │
│ ┌───────────────────────────────────────┐ │
│ │ sk-proj-abc123xyz... (masked display) │ ← Paste key
│ └───────────────────────────────────────┘ │
│ https://console.anthropic.com/            │
└─────────────────────────────────────────┘
```

### Step 3: Save or Clear
```
Option A: Save
┌─────────────────────┬───────────────────┐
│   SAVE KEY (click)  │     CLEAR KEY     │
└─────────────────────┴───────────────────┘
           ↓
     ✓ API Key Saved (green, auto-dismisses)

Option B: Clear
┌─────────────────────┬───────────────────┐
│   SAVE KEY          │  CLEAR KEY (click)│
└─────────────────────┴───────────────────┘
           ↓
     ✓ API Key Cleared (green, auto-dismisses)
```

## Comparison with Other Tabs

### Side-by-Side View

```
CONTROL PANEL TAB             CONFIG TAB
┌──────────────────┐         ┌──────────────────┐
│ Backend URL      │         │ API Key Input    │
│ Robot Type       │         │ Help Text        │
│ Robot Selector   │         │ Save/Clear BTNs  │
│ D-Pad Controls   │         │ Status Message   │
│ Arm Sliders      │         │                  │
│ Action Buttons   │         │                  │
└──────────────────┘         └──────────────────┘

SCRIPT TAB (WOWE only)
┌──────────────────┐
│ Script Editor    │
│ Status Info      │
│ AST/Timeline     │
│ Log Output       │
└──────────────────┘
```

## Styling Consistency

The CONFIG panel uses the same design language as the rest of the dashboard:

✓ **Dark Theme**: Black/dark blue backgrounds with cyan accents  
✓ **Glass Panels**: Semi-transparent borders with shadows  
✓ **Cyan Highlights**: `#27d3ff` for active elements  
✓ **Amber Secondary**: `#ffb020` for secondary actions  
✓ **Typography**: Bold, spaced uppercase labels  
✓ **Spacing**: 10-12px gaps, consistent padding  
✓ **Hover States**: Background + border color shifts  
✓ **Animations**: 120-160ms smooth transitions  

## Responsive Behavior

- **Desktop (≥980px)**: Full-width config panel on the right
- **Tablet/Narrow (≤980px)**: Stacked layout, full-width panels
- **Input Field**: Always full width for easy editing
- **Buttons**: Side-by-side on desktop, can stack on mobile if needed

---

**The CONFIG panel blends seamlessly into the tactical C2 aesthetic while providing professional, secure API key management.**
