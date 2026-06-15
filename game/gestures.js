// gestures.js — swipe detection. Records the pointer path and forwards it to
// physics.applySwipe so a swipe can intersect resting balls and launch them.

import { applySwipe } from "./physics.js";

const MIN_SWIPE_DIST = 30;
const MAX_PATH_SAMPLES = 64;

function vibrate(pattern) {
  if (navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (_) {}
  }
}

export function initGestures(state, onSwipe) {
  // Listen on pitch-container so swipes anywhere on the pitch register —
  // resting balls live in the bottom half and the swipe path itself is what
  // determines which (if any) ball gets launched.
  const zone = document.getElementById("pitch-container")
            || document.getElementById("swipe-zone");
  if (!zone) return;
  zone.style.touchAction = "none";

  let path = [];
  let startTime = 0;
  let tracking = false;
  let pointerId = null;

  function onDown(e) {
    if (tracking) return;
    tracking = true;
    pointerId = e.pointerId;
    path = [{ x: e.clientX, y: e.clientY }];
    startTime = performance.now();
    try { zone.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function onMove(e) {
    if (!tracking || e.pointerId !== pointerId) return;
    path.push({ x: e.clientX, y: e.clientY });
    if (path.length > MAX_PATH_SAMPLES) {
      // Keep first sample + most recent — preserves overall direction
      path = [path[0], ...path.slice(-MAX_PATH_SAMPLES + 1)];
    }
  }

  function onUp(e) {
    if (!tracking || e.pointerId !== pointerId) return;
    tracking = false;
    try { zone.releasePointerCapture(e.pointerId); } catch (_) {}

    const elapsed = Math.max(1, performance.now() - startTime);
    if (path.length < 2) return;

    const sx = path[0].x, sy = path[0].y;
    const ex = path[path.length - 1].x, ey = path[path.length - 1].y;
    const dist = Math.hypot(ex - sx, ey - sy);
    if (dist < MIN_SWIPE_DIST) return;

    const launched = applySwipe(path, elapsed);
    if (launched > 0) {
      vibrate(25);
      if (typeof onSwipe === "function") onSwipe(launched);
    }
  }

  function onCancel(e) {
    if (e.pointerId !== pointerId) return;
    tracking = false;
    path = [];
  }

  zone.addEventListener("pointerdown", onDown);
  zone.addEventListener("pointermove", onMove);
  zone.addEventListener("pointerup", onUp);
  zone.addEventListener("pointercancel", onCancel);
}

export function goalHaptic() {
  vibrate([40, 20, 40]);
}
