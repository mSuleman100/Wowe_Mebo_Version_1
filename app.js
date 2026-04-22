/*
 ==============================================================================
  LEGACY FILE (app.js) - WOWE Frontend (Deprecated)

  Author:   M. Suleman Anwar
  Date:     2026-01-15

  Purpose:
  - This was the original minimal prototype (single <img> + direction buttons).

  Current Architecture:
  - The active UI now lives in src/ (ES Modules) and is loaded by index.html.
  - Kept here only for reference.
 ==============================================================================
*/

const SERVER = "http://localhost:8000";

function sendCmd(cmd) {
  fetch(`${SERVER}/cmd/${cmd}`)
    .then(() => console.log("Command sent:", cmd))
    .catch(err => console.error(err));
}

function updateVideo() {
  document.getElementById("video").src =
    `${SERVER}/video?ts=${Date.now()}`;
}

setInterval(updateVideo, 150);
