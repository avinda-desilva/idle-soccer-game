// ui.js — DOM manipulation, HUD updates, animations, and modals

import { formatMoney } from "./economy.js";
import { PRESTIGE_BRACKETS } from "./constants.js";

let els = {};
let _toastQueue = [];
let _toastVisible = 0;
const MAX_TOASTS = 3;

// ─── Init ────────────────────────────────────────────────────────────────────

export function initUI(state) {
  els = {
    moneyDisplay: document.getElementById("money-display"),
    passiveRate:  document.getElementById("passive-rate"),
    goal:         document.getElementById("goal"),
    shopBtn:      document.getElementById("shop-btn"),
    shopPanel:    document.getElementById("shop-panel"),
    toastContainer: document.getElementById("toast-container"),
  };

  els.goal.style.width  = state.goalWidth  + "px";
  els.goal.style.height = state.goalHeight + "px";

  return els;
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

let _currentDisplayedMoney = 0;
let _rafId = null;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateCounter(el, from, to, duration = 300) {
  if (_rafId) cancelAnimationFrame(_rafId);
  const start = performance.now();
  function step(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    const value = from + (to - from) * easeOutCubic(t);
    el.textContent = formatMoney(value);
    if (t < 1) {
      _rafId = requestAnimationFrame(step);
    } else {
      _rafId = null;
      _currentDisplayedMoney = to;
    }
  }
  _rafId = requestAnimationFrame(step);
}

export function updateHUD(state) {
  animateCounter(els.moneyDisplay, _currentDisplayedMoney, state.money);

  if (state.passiveIncome > 0) {
    els.passiveRate.textContent = `+${formatMoney(state.passiveIncome)}/sec`;
  } else {
    els.passiveRate.textContent = "Swipe ↑ to score";
  }

  els.goal.style.width  = state.goalWidth  + "px";
  els.goal.style.height = state.goalHeight + "px";
}

// ─── Floating text ───────────────────────────────────────────────────────────

export function spawnFloatingText(value, isVAR = false) {
  const rect = els.goal.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top  + rect.height / 2;

  const div = document.createElement("div");
  div.className = "float-text";
  div.textContent = isVAR
    ? `VAR ×2 +${formatMoney(value * 2)}`
    : `+${formatMoney(value)}`;
  div.style.left  = cx + "px";
  div.style.top   = cy + "px";
  div.style.color = isVAR ? "var(--gold)" : "#fff";

  document.body.appendChild(div);
  div.addEventListener("animationend", () => div.remove());
}

// ─── VAR flash ───────────────────────────────────────────────────────────────

export function showVARFlash() {
  screenShake();

  const overlay = document.createElement("div");
  overlay.className = "var-flash-overlay";
  overlay.innerHTML = `<span>📹 VAR REVIEW… GOAL CONFIRMED ✅</span>`;
  document.body.appendChild(overlay);

  // flash in 200ms, hold 600ms, fade out 400ms — total 1200ms
  overlay.animate(
    [
      { opacity: 0 },
      { opacity: 0.3, offset: 200 / 1200 },
      { opacity: 0.3, offset: 800 / 1200 },
      { opacity: 0 },
    ],
    { duration: 1200, easing: "ease", fill: "forwards" }
  ).onfinish = () => overlay.remove();
}

// ─── Screen shake ────────────────────────────────────────────────────────────

export function screenShake(intensity = 8, duration = 400) {
  const body = document.body;
  const start = Date.now();
  const id = setInterval(() => {
    const elapsed = Date.now() - start;
    if (elapsed >= duration) {
      clearInterval(id);
      body.style.transform = "";
      return;
    }
    const decay = 1 - elapsed / duration;
    const dx = (Math.random() * 2 - 1) * intensity * decay;
    const dy = (Math.random() * 2 - 1) * intensity * decay;
    body.style.transform = `translate(${dx}px, ${dy}px)`;
  }, 16);
}

// ─── Goal pulse ──────────────────────────────────────────────────────────────

export function showGoalPulse() {
  els.goal.classList.add("scored");
  setTimeout(() => els.goal.classList.remove("scored"), 700);
}

// ─── Toasts ──────────────────────────────────────────────────────────────────

function _showNextToast() {
  if (_toastVisible >= MAX_TOASTS || _toastQueue.length === 0) return;

  const { message, emoji, subtitle } = _toastQueue.shift();
  _toastVisible++;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <div class="toast-heading">${emoji ? emoji + " " : ""}${message}</div>
    ${subtitle ? `<div class="toast-sub">${subtitle}</div>` : ""}
  `;

  toast.style.animation = "slideInRight 0.3s ease forwards";
  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideOutRight 0.3s ease forwards";
    toast.addEventListener("animationend", () => {
      toast.remove();
      _toastVisible--;
      _showNextToast();
    }, { once: true });
  }, 3000);
}

export function showToast(message, emoji = "", subtitle = "") {
  _toastQueue.push({ message, emoji, subtitle });
  _showNextToast();
}

// ─── Offline modal ───────────────────────────────────────────────────────────

export function showOfflineModal(earned, secondsAway, state) {
  const overlay = _createModalOverlay();
  overlay.innerHTML = `
    <div class="modal-box">
      <h2>⏱ Welcome back!</h2>
      <p>You scored while away.</p>
      <div class="modal-stat">Time away: <strong>${formatDuration(secondsAway)}</strong></div>
      <div class="modal-stat">Earnings: <strong>${formatMoney(earned)}</strong></div>
      <button class="modal-btn" id="offline-collect-btn">Collect</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#offline-collect-btn").addEventListener("click", () => {
    state.money += earned;
    overlay.remove();
  });
}

// ─── Prestige modal ──────────────────────────────────────────────────────────

export function showPrestigeModal(state, onConfirm) {
  const currentBracketIdx = Math.min(state.prestigeCount, PRESTIGE_BRACKETS.length - 1);
  const nextBracketIdx    = Math.min(state.prestigeCount + 1, PRESTIGE_BRACKETS.length - 1);
  const current = PRESTIGE_BRACKETS[currentBracketIdx];
  const next    = PRESTIGE_BRACKETS[nextBracketIdx];

  const overlay = _createModalOverlay();
  overlay.innerHTML = `
    <div class="modal-box">
      <h2>🏆 Prestige?</h2>
      <div class="modal-stat">Current: <strong>${current.icon} ${current.name}</strong> (×${current.multiplier})</div>
      <div class="modal-stat">Next: <strong>${next.icon} ${next.name}</strong> (×${next.multiplier})</div>
      <p class="modal-sub">All progress resets. Your multiplier increases permanently.</p>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--confirm" id="prestige-confirm-btn">Go for it 🏆</button>
        <button class="modal-btn modal-btn--cancel"  id="prestige-cancel-btn">Not yet</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#prestige-confirm-btn").addEventListener("click", () => {
    overlay.remove();
    if (typeof onConfirm === "function") onConfirm();
  });
  overlay.querySelector("#prestige-cancel-btn").addEventListener("click", () => {
    overlay.remove();
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function _createModalOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  return overlay;
}
