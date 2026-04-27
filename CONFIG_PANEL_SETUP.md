# CONFIG Panel - Claude API Key Setup

## Overview

A professional **CONFIG tab** has been added to the WOWE Tactical C2 dashboard for secure management of Claude API keys. The panel integrates seamlessly into the existing UI without disrupting any previous functionality.

## What Was Added

### 1. **New Component: `src/components/config_panel.js`**
   - `render_config_card()` - Renders the CONFIG panel card with professional styling
   - `render_config_panel_content()` - Renders the API key input and action buttons
   - `load_claude_api_key()` - Retrieves API key from localStorage
   - `save_claude_api_key(key)` - Persists API key to localStorage
   - `clear_claude_api_key()` - Removes API key from localStorage

### 2. **Updated `src/components/control_panel.js`**
   - Added **CONFIG** tab to the tab navigation alongside CONTROL PANEL and SCRIPT

### 3. **Updated `src/app/bootstrap.js`**
   - Imported config_panel functions
   - Added `bind_config_panel()` function to handle:
     - SAVE KEY button → saves API key to localStorage with success feedback
     - CLEAR KEY button → removes API key with confirmation feedback
     - Status messages with auto-dismiss (3 seconds)
   - Extended `switch_right_tab()` to handle the "config" tab with proper DOM management

### 4. **Updated `src/styles/main.css`**
   - Added `.config` styling for clean, professional layout
   - `.config__section` - Section grouping with proper spacing
   - `.config__help-text` - Help text styling with muted color
   - `.config__buttons` - Two-column button grid (SAVE / CLEAR)
   - `.btn--secondary` - Amber-colored secondary button variant
   - `.config__status` - Status message display with success/error states
   - `.config__status--success` - Green success indicator
   - `.config__status--error` - Red error indicator

## Features

✅ **Secure Storage**: API keys are stored in browser localStorage  
✅ **User Feedback**: Status messages confirm save/clear actions  
✅ **Professional UI**: Matches the tactical C2 aesthetic (dark, cyan accents)  
✅ **Non-Intrusive**: Doesn't interfere with existing controls or MEBO/WOWE robot types  
✅ **Visible for Both Robots**: CONFIG tab is available for both WOWE and MEBO robots  
✅ **Clean Design**: Consistent with existing button and input styling  

## Usage

1. **Navigate to CONFIG tab** - Click the "CONFIG" button in the right panel
2. **Enter API Key** - Paste your Claude API key (starts with `sk-`)
3. **Save** - Click "SAVE KEY" to store locally
4. **Clear** - Click "CLEAR KEY" to remove stored key
5. **Get Key** - Visit https://console.anthropic.com/ to generate an API key

## API Key Input Details

- **Type**: Password input (masked display)
- **Placeholder**: `sk-...` (hint for key format)
- **Autocomplete**: Disabled for security
- **Help Text**: "Get your API key from https://console.anthropic.com/"

## Status Feedback

### On Save Success:
- Message: "✓ API Key Saved"
- Color: Green (lime)
- Duration: Shows for 3 seconds, then auto-dismisses

### On Clear Success:
- Message: "✓ API Key Cleared"
- Color: Green (lime)
- Duration: Shows for 3 seconds, then auto-dismisses

### On Error:
- Message: "API key cannot be empty" or "Failed to save API key"
- Color: Red
- Duration: Stays visible until user saves valid key

## Technical Notes

- **Storage Key**: `claude_api_key` in localStorage
- **No Backend Dependency**: All storage is client-side
- **Password Input**: API key is masked in the UI (not shown in plaintext)
- **Tab Switching**: CONFIG tab is available for both WOWE and MEBO robot types
- **Styling**: Uses existing CSS variables (`--accent`, `--muted`, `--text`, etc.)

## File Changes Summary

```
Modified:
  ✓ src/components/control_panel.js       (added CONFIG tab)
  ✓ src/app/bootstrap.js                  (added config imports & wiring)
  ✓ src/styles/main.css                   (added config styling)

Created:
  ✓ src/components/config_panel.js        (new config component)
```

## Integration Points

The CONFIG panel integrates at three key locations:

1. **Tab Navigation** - Added as a third tab (after SCRIPT)
2. **Tab Content** - Renders config form when tab is selected
3. **Event Binding** - Wires up SAVE/CLEAR buttons and localStorage persistence

No existing UI elements were modified or removed—only additions were made.

---

**Ready to use!** The CONFIG panel is now fully integrated and ready for Claude API key management.
