# Dynamic Camera Feeds Implementation

## Overview
The camera feed system has been updated to dynamically adjust based on the number of robots registered in the system. Instead of fixed 2x2 grid with 4 hardcoded feeds, the grid now scales to accommodate any number of robots.

## Changes Made

### 1. **Video Wall Component** (`src/components/video_wall.js`)
- Added `data-feed-count` attribute to the video wall container
- This attribute tracks the number of feeds for CSS-based grid adjustment

### 2. **Bootstrap Logic** (`src/app/bootstrap.js`)
- **New Function**: `generate_feeds_from_robots()`
  - Converts registered robots into feed objects
  - Each robot becomes one feed tile
  - Returns static FEEDS as fallback when no robots are registered
  - Marks the first robot as "active" for styling

- **Video Wall Container**: 
  - Created a wrapper container (`video-wall-container`) to hold the dynamic video wall
  - Allows easy re-rendering when robots change

- **Update Function**: `update_video_wall()`
  - Called whenever robots are added or removed
  - Re-renders the entire video wall with new feeds
  - Automatically starts MJPEG streams for all feeds
  - Updates the layout dynamically

- **Integration with Robot Management**:
  - Robot management panel now triggers `update_video_wall()` on changes
  - Ensures camera feeds stay synchronized with registered robots

- **Dynamic MJPEG Streams**:
  - Updated `start_loops()` to use current feeds instead of static FEEDS
  - Updated server settings handler to refresh streams with dynamic feeds

### 3. **Responsive CSS Grid** (`src/styles/main.css`)
The grid automatically adjusts based on feed count:

| Feed Count | Layout |
|-----------|--------|
| 1 | Single column (1x1) |
| 2 | 2 columns (2x1) |
| 3 | 3 columns (3x1) |
| 4 | 2x2 grid |
| 5 | 3 columns, 2 rows |
| 6 | 3x2 grid |
| 7 | 3 columns, 3 rows |
| 8 | 4x2 grid |
| 9 | 3x3 grid |
| 10-12 | 4 columns |
| 13+ | 5 columns |

## How It Works

### Adding a New Robot
1. User adds a robot in **Settings → ROBOT MANAGEMENT**
2. Robot details (name, device_id, feed_id, type) are saved
3. Robot management panel triggers `on_change()` callback
4. `update_video_wall()` is called:
   - Generates new feeds list from registered robots
   - Re-renders the entire video wall
   - Starts MJPEG streams for all feeds
   - Updates CSS grid layout based on feed count

### Feed Generation
```javascript
// Each robot becomes a feed:
{
  id: robot.feed_id || robot.device_id,      // Unique feed identifier
  label: robot.name,                          // Display name (e.g., "BRAVO-2")
  is_active: index === 0                      // First robot highlighted
}
```

### CSS Grid Adaptation
The `.video-wall[data-feed-count="X"]` selector determines the grid layout. For example:
- `data-feed-count="4"` → `grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;`
- `data-feed-count="6"` → `grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr);`

## Backward Compatibility

If no robots are registered:
- System displays the default 4 feeds (ALPHA, BRAVO, CHARLIE, DELTA)
- Layout is the original 2x2 grid
- No changes to user experience when using defaults

## Performance Considerations

- MJPEG streams are only created for registered robots
- Old streams are replaced when the wall re-renders
- No memory leaks from abandoned streams (DOM cleanup handles this)

## Future Enhancements

Possible improvements:
1. **Persistent Layout Preferences**: Allow users to customize grid layout
2. **Feed Reordering**: Drag-and-drop to reorder feed tiles
3. **Feed Grouping**: Group feeds by robot type (WOWE vs MEBO)
4. **Fullscreen Mode**: Click to expand a single feed to fullscreen
5. **Custom Grid Size**: Let users specify preferred column count
6. **Responsive Breakpoints**: Different layouts for mobile/tablet/desktop

## Testing Checklist

- [ ] Add 5 robots → Grid shows 3 columns, 2 rows
- [ ] Add 8 robots → Grid shows 4 columns, 2 rows
- [ ] Add 9 robots → Grid shows 3x3 grid
- [ ] Remove a robot → Grid re-renders correctly
- [ ] MJPEG streams start for all feeds
- [ ] Camera feeds display correctly for new robots
- [ ] Switching server origin updates all feeds
- [ ] Default feeds still work when no robots registered
