"""
==============================================================================
 WOWE Backend - Placeholder Frame Generator (backend/utils/frame_generator.py)

 Author:   M. Suleman Anwar
 Date:     2026-01-15

 Purpose:
 - Generate a "tactical looking" JPEG frame when no real feed is available yet.
 - Used as a safe fallback so the UI always has something to display.

 Notes:
 - Real frames come from ESP32-CAM via POST /video/{feed_id}/upload.
==============================================================================
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from random import Random

from PIL import Image, ImageDraw, ImageFont


@dataclass(frozen=True)
class FrameSpec:
    feed_id: str
    width: int = 960
    height: int = 540


def _safe_feed_seed(feed_id: str) -> int:
    """Deterministic seed per feed_id so each feed has stable-ish visuals."""
    return sum(ord(c) for c in feed_id) % 10_000


def render_placeholder_jpeg(*, spec: FrameSpec) -> bytes:
    """Render a generated JPEG image (used when no uploaded frame exists)."""
    if not spec.feed_id:
        raise ValueError("feed_id is required")

    rng = Random(_safe_feed_seed(spec.feed_id))
    base = Image.new("RGB", (spec.width, spec.height), (8, 14, 20))
    draw = ImageDraw.Draw(base)

    # Subtle scanlines
    for y in range(0, spec.height, 4):
        draw.line([(0, y), (spec.width, y)], fill=(10, 20, 28), width=1)

    # Random-ish boxes to feel "live"
    for _ in range(24):
        x0 = rng.randint(0, spec.width - 30)
        y0 = rng.randint(0, spec.height - 30)
        x1 = min(spec.width, x0 + rng.randint(30, 220))
        y1 = min(spec.height, y0 + rng.randint(20, 160))
        color = (rng.randint(15, 50), rng.randint(40, 110), rng.randint(70, 140))
        draw.rectangle([x0, y0, x1, y1], outline=color, width=2)

    # HUD header strip
    draw.rectangle([0, 0, spec.width, 46], fill=(10, 24, 36))
    draw.line([(0, 46), (spec.width, 46)], fill=(40, 140, 170), width=1)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    title = f"FEED: {spec.feed_id.upper()}  |  {now}"

    # Font: try default; keep robust across Windows/Linux
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None

    draw.text((14, 14), title, fill=(235, 245, 255), font=font)

    # Crosshair
    cx, cy = spec.width // 2, spec.height // 2
    draw.line([(cx - 22, cy), (cx + 22, cy)], fill=(39, 211, 255), width=2)
    draw.line([(cx, cy - 22), (cx, cy + 22)], fill=(39, 211, 255), width=2)

    buffer = BytesIO()
    base.save(buffer, format="JPEG", quality=80, optimize=True)
    return buffer.getvalue()

