/*
 ==============================================================================
  MEBO Robot - Joystick and Slider Utilities (src/utils/joystick.js)

  Author:   M. Suleman Anwar
  Date:     2026-01-15

  Purpose:
  - Handles joystick and slider interactions for MEBO robot
  - Sends commands based on joystick/slider positions
  - Completely separate from WOWE controls

  Notes:
  - These functions are called from bootstrap.js after MEBO UI is rendered
 ==============================================================================
*/

/**
 * ==============================================================================
 *  setup_joystick()
 *
 *  Purpose:
 *  - Setup circular joystick for movement control
 *  - Calls onCommand callback when joystick is moved
 * ==============================================================================
 */
export const setup_joystick = ({ joystickId, maxDistance = 27, onCommand }) => {
  const joystick = document.getElementById(joystickId);
  if (!joystick) return;

  const joystickBase = joystick.parentElement;
  let isDragging = false;
  let lastCommand = null;
  let lastCommandTime = 0;
  const THROTTLE_MS = 50; // Throttle commands to max once per 50ms for responsiveness

  const handleStart = (e) => {
    isDragging = true;
    e.preventDefault();
  };

  const handleMove = (clientX, clientY) => {
    if (!isDragging) return;

    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    let newX, newY;
    if (distance > maxDistance) {
      const angle = Math.atan2(deltaY, deltaX);
      newX = Math.cos(angle) * maxDistance;
      newY = Math.sin(angle) * maxDistance;
    } else {
      newX = deltaX;
      newY = deltaY;
    }

    joystick.style.transform = `translate(${newX}px, ${newY}px)`;

    // Determine command based on direction
    const threshold = maxDistance * 0.3; // 30% threshold for command
    let command = null;

    if (Math.abs(newY) > Math.abs(newX)) {
      // Vertical movement
      if (newY < -threshold) command = "mebo_forward";
      else if (newY > threshold) command = "mebo_reverse";
    } else {
      // Horizontal movement
      if (newX < -threshold) command = "mebo_rotate_left";
      else if (newX > threshold) command = "mebo_rotate_right";
    }

    // Send command if changed AND throttled (max once per 50ms)
    const now = Date.now();
    if (command && command !== lastCommand && onCommand && (now - lastCommandTime >= THROTTLE_MS)) {
      onCommand(command);
      lastCommand = command;
      lastCommandTime = now;
    }
  };

  const handleEnd = () => {
    if (isDragging) {
      isDragging = false;
      joystick.style.transform = "translate(0, 0)";
      if (lastCommand && onCommand) {
        onCommand("mebo_stop");
        lastCommand = null;
      }
    }
  };

  // Mouse events
  joystick.addEventListener("mousedown", handleStart);
  document.addEventListener("mousemove", (e) => handleMove(e.clientX, e.clientY));
  document.addEventListener("mouseup", handleEnd);

  // Touch events
  joystick.addEventListener("touchstart", handleStart);
  document.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
  });
  document.addEventListener("touchend", handleEnd);
};

/**
 * ==============================================================================
 *  setup_vertical_slider()
 *
 *  Purpose:
 *  - Setup vertical slider for claw/joint control
 *  - Calls onCommand callback when slider is moved
 * ==============================================================================
 */
export const setup_vertical_slider = ({ sliderId, trackId, onUpCommand, onDownCommand, onCommand, onStopCommand }) => {
  const slider = document.getElementById(sliderId);
  const track = document.getElementById(trackId);
  if (!slider || !track) return;

  let isDragging = false;
  const trackHeight = 100;
  const handleSize = 32;
  const maxDistance = (trackHeight - handleSize) / 2;
  let lastCommand = null;
  let repeatInterval = null; // Interval for continuous command sending
  const REPEAT_MS = 50; // Send command every 50ms while held (matches Arduino delay)

  const clearRepeat = () => {
    if (repeatInterval) {
      clearInterval(repeatInterval);
      repeatInterval = null;
    }
  };

  const startRepeat = (command) => {
    clearRepeat(); // Clear any existing interval
    if (command && onCommand) {
      // Send immediately
      onCommand(command);
      // Then repeat every 50ms
      repeatInterval = setInterval(() => {
        if (onCommand) onCommand(command);
      }, REPEAT_MS);
    }
  };

  const handleStart = (e) => {
    isDragging = true;
    e.preventDefault();
  };

  const handleMove = (clientY) => {
    if (!isDragging) return;

    const rect = track.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const deltaY = clientY - centerY;
    const clampedY = Math.max(-maxDistance, Math.min(maxDistance, deltaY));

    slider.style.top = `${50 + (clampedY / maxDistance) * 50}%`;
    slider.style.transform = "translateX(-50%)";

    // Determine command
    const threshold = maxDistance * 0.3;
    let command = null;

    if (clampedY < -threshold && onUpCommand) {
      command = onUpCommand;
    } else if (clampedY > threshold && onDownCommand) {
      command = onDownCommand;
    }

    // If command changed, update repeat interval
    if (command !== lastCommand) {
      lastCommand = command;
      if (command) {
        startRepeat(command);
      } else {
        clearRepeat();
      }
    }
  };

  const handleEnd = () => {
    if (isDragging) {
      isDragging = false;
      slider.style.top = "50%";
      slider.style.transform = "translateX(-50%)";
      clearRepeat();
      // Send stop command to clear queue when slider is released
      if (onStopCommand && onCommand) {
        onCommand(onStopCommand);
      }
      lastCommand = null;
    }
  };

  slider.addEventListener("mousedown", handleStart);
  document.addEventListener("mousemove", (e) => handleMove(e.clientY));
  document.addEventListener("mouseup", handleEnd);

  slider.addEventListener("touchstart", handleStart);
  document.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) handleMove(e.touches[0].clientY);
  });
  document.addEventListener("touchend", handleEnd);
};

/**
 * ==============================================================================
 *  setup_horizontal_slider()
 *
 *  Purpose:
 *  - Setup horizontal slider for rotation control
 *  - Calls onCommand callback when slider is moved
 * ==============================================================================
 */
export const setup_horizontal_slider = ({ sliderId, trackId, onLeftCommand, onRightCommand, onCommand, onStopCommand }) => {
  const slider = document.getElementById(sliderId);
  const track = document.getElementById(trackId);
  if (!slider || !track) return;

  let isDragging = false;
  const trackWidth = track.offsetWidth;
  const handleSize = 32;
  const maxDistance = (trackWidth - handleSize) / 2;
  let lastCommand = null;
  let repeatInterval = null; // Interval for continuous command sending
  const REPEAT_MS = 50; // Send command every 50ms while held (matches Arduino delay)

  const clearRepeat = () => {
    if (repeatInterval) {
      clearInterval(repeatInterval);
      repeatInterval = null;
    }
  };

  const startRepeat = (command) => {
    clearRepeat(); // Clear any existing interval
    if (command && onCommand) {
      // Send immediately
      onCommand(command);
      // Then repeat every 50ms
      repeatInterval = setInterval(() => {
        if (onCommand) onCommand(command);
      }, REPEAT_MS);
    }
  };

  const handleStart = (e) => {
    isDragging = true;
    e.preventDefault();
  };

  const handleMove = (clientX) => {
    if (!isDragging) return;

    const rect = track.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const deltaX = clientX - centerX;
    const clampedX = Math.max(-maxDistance, Math.min(maxDistance, deltaX));

    slider.style.left = `${50 + (clampedX / maxDistance) * 50}%`;
    slider.style.transform = "translateY(-50%)";

    // Determine command
    const threshold = maxDistance * 0.3;
    let command = null;

    if (clampedX < -threshold && onLeftCommand) {
      command = onLeftCommand;
    } else if (clampedX > threshold && onRightCommand) {
      command = onRightCommand;
    }

    // If command changed, update repeat interval
    if (command !== lastCommand) {
      lastCommand = command;
      if (command) {
        startRepeat(command);
      } else {
        clearRepeat();
      }
    }
  };

  const handleEnd = () => {
    if (isDragging) {
      isDragging = false;
      slider.style.left = "50%";
      slider.style.transform = "translateY(-50%)";
      clearRepeat();
      // Send stop command to clear queue when slider is released
      if (onStopCommand && onCommand) {
        onCommand(onStopCommand);
      }
      lastCommand = null;
    }
  };

  slider.addEventListener("mousedown", handleStart);
  document.addEventListener("mousemove", (e) => handleMove(e.clientX));
  document.addEventListener("mouseup", handleEnd);

  slider.addEventListener("touchstart", handleStart);
  document.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) handleMove(e.touches[0].clientX);
  });
  document.addEventListener("touchend", handleEnd);
};
