// gestures.js — swipe detection, direction classification, and power scoring

import {
  MIN_SWIPE_PX,
  MAX_SWIPE_SPEED,
  POWER_FACTOR,
} from "./constants.js";

const SWIPE_LOCKOUT_MS = 600;

function vibrate(pattern) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (_) {}
  }
}

function ensureSwipeHint(zone) {
  let hint = document.getElementById("swipe-hint");
  if (!hint) {
    hint = document.createElement("div");
    hint.id = "swipe-hint";
    hint.textContent = "↑";
    document.body.appendChild(hint);
  }
  return hint;
}

export function initGestures(state, onSwipe) {
  const zone = document.getElementById("swipe-zone");
  if (!zone) return;
  const hint = ensureSwipeHint(zone);

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let currentX = 0;
  let currentY = 0;
  let tracking = false;
  let pointerId = null;

  function onDown(e) {
    if (tracking) return;
    tracking = true;
    pointerId = e.pointerId;
    startX = currentX = e.clientX;
    startY = currentY = e.clientY;
    startTime = Date.now();
    hint.style.left = e.clientX + "px";
    hint.style.top = e.clientY + "px";
    hint.style.opacity = "0.55";
    try {
      zone.setPointerCapture(e.pointerId);
    } catch (_) {}
  }

  function onMove(e) {
    if (!tracking || e.pointerId !== pointerId) return;
    currentX = e.clientX;
    currentY = e.clientY;
  }

  function onUp(e) {
    if (!tracking || e.pointerId !== pointerId) return;
    tracking = false;
    hint.style.opacity = "0";
    try {
      zone.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const deltaY = startY - currentY;
    const deltaX = currentX - startX;
    const elapsed = Date.now() - startTime || 1;

    if (deltaY < MIN_SWIPE_PX) return;
    if (state.swipeActive) return;

    let swipeSpeed = (deltaY / elapsed) * 1000 * 0.04;
    swipeSpeed = Math.max(0, Math.min(MAX_SWIPE_SPEED, swipeSpeed));

    const vy = -(swipeSpeed * POWER_FACTOR);
    const vx = (deltaX / 120) * 2.5;

    state.swipeActive = true;
    vibrate(30);
    onSwipe(vx, vy);

    setTimeout(() => {
      state.swipeActive = false;
    }, SWIPE_LOCKOUT_MS);
  }

  function onCancel(e) {
    if (e.pointerId !== pointerId) return;
    tracking = false;
    hint.style.opacity = "0";
  }

  zone.addEventListener("pointerdown", onDown);
  zone.addEventListener("pointermove", onMove);
  zone.addEventListener("pointerup", onUp);
  zone.addEventListener("pointercancel", onCancel);
}

export function goalHaptic() {
  vibrate([40, 20, 40]);
}
