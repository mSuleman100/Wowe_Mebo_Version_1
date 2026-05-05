/*
 ==============================================================================
  WOWE Tactical C2 - Video Wall Component (src/components/video_wall.js)

  Author:   M. Suleman Anwar
  Date:     2026-01-15

  Purpose:
  - Renders the 2x2 grid of feed tiles.
  - Each tile contains:
      - Header (feed label + latency)
      - Body (image element + "NO SIGNAL" overlay)

  Notes:
  - Actual image URLs are set by src/app/bootstrap.js (polling /video/{feed_id}).
 ==============================================================================
*/

import { el } from "../utils/dom.js";

/**
 * ==============================================================================
 *  render_feed_tile()
 *
 *  Purpose:
 *  - Render one feed tile (header + image + "NO SIGNAL" overlay)
 * ==============================================================================
 */
const render_feed_tile = ({ feed }) => {
  // Single feed tile (header + image).
  const tile = el({
    tag: "div",
    class_name: `feed ${feed.is_active ? "feed--active" : ""}`,
    attrs: { "data-feed-id": feed.id },
  });

  const header = el({ tag: "div", class_name: "feed__header" });
  header.append(
    el({
      tag: "div",
      class_name: "feed__label",
      text: `FEED ${feed.id.toUpperCase().slice(0, 2)}: ${feed.label}${feed.is_active ? " (Active)" : ""
        }`,
    }),
    el({
      tag: "div",
      class_name: "feed__meta",
      attrs: { id: `latency-${feed.id}` },
      text: "LATENCY: -- ms",
    })
  );

  const body = el({ tag: "div", class_name: "feed__body" });
  const img = el({
    tag: "img",
    class_name: "feed__img",
    attrs: {
      alt: `${feed.label} video feed`,
      id: `feed-img-${feed.id}`,
      draggable: "false",
    },
  });
  const overlay = el({
    tag: "div",
    class_name: "feed__overlay",
    text: "NO SIGNAL",
  });

  body.append(img, overlay);
  tile.append(header, body);
  return tile;
};

/**
 * ==============================================================================
 *  render_video_wall()
 *
 *  Purpose:
 *  - Render the video wall containing all feed tiles (dynamically sized)
 *  - Grid automatically adjusts based on number of feeds
 * ==============================================================================
 */
export const render_video_wall = ({ feeds }) => {
  // Build the wall container and append tiles for each feed.
  // Set data attribute with feed count for CSS grid adjustment
  const wall = el({
    tag: "div",
    class_name: "video-wall",
    attrs: { "data-feed-count": feeds.length }
  });
  for (const feed of feeds) wall.append(render_feed_tile({ feed }));
  return wall;
};

