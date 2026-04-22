# WOWE Tactical C2 (Frontend UI)

This repo currently contains **only the frontend UI** for a robot control + multi-camera dashboard (inspired by a “tactical C2” layout).

## Architecture (Frontend)

```
src/
  api/                 # Backend contract: ALL network calls live here
    robot_api.js
  app/                 # App bootstrap + loops + keyboard shortcuts + wiring
    bootstrap.js
    constants.js
  components/          # UI components (render-only helpers, DOM nodes)
    app_shell.js
    control_panel.js
    sequence_editor.js
    video_wall.js
  utils/               # Tiny framework-agnostic helpers
    dom.js
  styles/              # CSS theme + layout
    main.css
```

### Layers (how it’s structured)
- **API layer** (`src/api/robot_api.js`): builds URLs + performs `fetch()` calls. UI never calls `fetch()` directly.
- **App layer** (`src/app/bootstrap.js`): composes the UI, binds events, runs refresh/health loops, and holds small state.
- **Component layer** (`src/components/*`): returns DOM nodes for the dashboard panels (no direct networking).
- **Style layer** (`src/styles/main.css`): “tactical C2” theme, layout, and component styling.

### Component tree (what renders on screen)
- `render_app_shell()` (`src/components/app_shell.js`)
  - **Topbar**: title + ONLINE/OFFLINE pill
  - **Main layout**
    - Left: `render_video_wall()` (`src/components/video_wall.js`) → 4 feed tiles
    - Right: `render_control_panel()` (`src/components/control_panel.js`) + `render_sequence_editor()` (`src/components/sequence_editor.js`)
  - **Bottombar**: GLOBAL HALT button

### State + data flow (UI-only)
- **Server origin** (backend base URL): stored in `localStorage` (key: `wowe.server_origin`) and edited in the Control Panel.
- **Sequence steps**: stored in `localStorage` (key: `wowe.sequence_steps`) and managed by the Sequence Editor.
- **Video refresh loop**: `bootstrap.js` periodically updates each feed image `src` URL (cache-busted with `?ts=`) and measures a simple “latency” based on image load time.
- **Health loop**: `bootstrap.js` polls `/health` to drive the ONLINE/OFFLINE pill.

### Backend contract (planned, FastAPI)
The UI currently calls these endpoints (you can change them later in one place: `src/api/robot_api.js`):
- **GET** `/health` → backend is reachable
- **GET** `/video/{feed_id}` → returns a frame image for a feed (UI polls this URL)
- **POST** `/cmd/{cmd}` → movement/actions/IR commands
- **POST** `/sequence` → JSON `{ "steps": ["walk_fwd_2s", "turn_left_1s", "roar"] }`

### Backend (planned)
The backend will be a **Python/FastAPI** server that:
- Serves camera feeds (MJPEG/frames/WebRTC—your choice later)
- Accepts IR/robot commands (movement/actions/sequence execution)

The frontend is written so that backend wiring is centralized in `src/api/robot_api.js`.

## Run (UI only)

Any static server works. Examples:

- Python:

```bash
python -m http.server 5173
```

Then open `http://localhost:5173`.

## Controls
- Arrow keys / WASD: movement
- Spacebar: **GLOBAL HALT**

