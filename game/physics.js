// physics.js — ball trajectory, velocity, and collision calculations

import { GRAVITY } from "./constants.js";
import { getState } from "./state.js";

const BALL_RADIUS = 14;
const MAX_BALLS = 10;
const PATCH_OFFSETS = [
  { dx: 0, dy: 0, r: 3.2 },
  { dx: 7, dy: -4, r: 2.4 },
  { dx: -7, dy: -4, r: 2.4 },
  { dx: 7, dy: 5, r: 2.4 },
  { dx: -7, dy: 5, r: 2.4 },
  { dx: 0, dy: 9, r: 2.4 },
];

class Ball {
  constructor(startX, startY) {
    this.startX = startX;
    this.startY = startY;
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.radius = BALL_RADIUS;
    this.active = false;
    this.isAuto = false;
  }

  launch(vx, vy) {
    this.vx = vx;
    this.vy = vy;
    this.active = true;
  }

  update(dt, canvasH) {
    const step = dt / 16.6667;
    this.vy += GRAVITY * step;
    this.x += this.vx * step;
    this.y += this.vy * step;
    if (this.y > canvasH + 60) this.active = false;
    if (this.x < -60 || this.x > (canvasRef ? canvasRef.width : 99999) + 60) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#9ca3af";
    ctx.stroke();

    ctx.fillStyle = "#1f2937";
    for (const p of PATCH_OFFSETS) {
      ctx.beginPath();
      ctx.arc(this.x + p.dx, this.y + p.dy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  checkGoal(goalRect) {
    if (!goalRect) return false;
    return (
      this.x >= goalRect.x &&
      this.x <= goalRect.x + goalRect.w &&
      this.y >= goalRect.y &&
      this.y <= goalRect.y + goalRect.h
    );
  }

  reset(startX = this.startX, startY = this.startY) {
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.active = false;
    this.isAuto = false;
  }
}

let canvasRef = null;
let ctxRef = null;
let stateRef = null;
let balls = [];
let goalRect = null;
let onGoal = null;
let onFloatText = null;
let lastFrameTime = 0;
let rafId = null;
let autoShootTimer = null;
let resizeObserver = null;

function getStartPos() {
  if (!canvasRef) return { x: 0, y: 0 };
  return { x: canvasRef.width / 2, y: canvasRef.height - 80 };
}

function resizeCanvas() {
  if (!canvasRef) return;
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvasRef.width = w * dpr;
  canvasRef.height = h * dpr;
  canvasRef.style.width = w + "px";
  canvasRef.style.height = h + "px";
  ctxRef.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Resize canvas logically — store logical size
  canvasRef.logicalW = w;
  canvasRef.logicalH = h;
  // Reset inactive balls to new start
  const sp = { x: w / 2, y: h - 80 };
  for (const b of balls) {
    b.startX = sp.x;
    b.startY = sp.y;
    if (!b.active) b.reset(sp.x, sp.y);
  }
  updateGoalRect();
}

function ensurePoolSize() {
  if (!stateRef) return;
  const target = Math.min(MAX_BALLS, Math.max(1, stateRef.ballCount || 1));
  const sp = getStartPos();
  while (balls.length < target) balls.push(new Ball(sp.x, sp.y));
}

export function updateGoalRect() {
  const goalEl = document.getElementById("goal");
  const container = document.getElementById("pitch-container");
  if (!goalEl || !container || !canvasRef) {
    goalRect = null;
    return;
  }
  const gb = goalEl.getBoundingClientRect();
  const cb = canvasRef.getBoundingClientRect();
  goalRect = {
    x: gb.left - cb.left,
    y: gb.top - cb.top,
    w: gb.width,
    h: gb.height,
  };
}

function drawAutoTrajectory() {
  if (!stateRef || !ctxRef || !canvasRef) return;
  const auto = stateRef.upgrades?.autoShooter || 0;
  if (auto <= 0 || !goalRect) return;
  const sp = getStartPos();
  const targetX = goalRect.x + goalRect.w / 2;
  const targetY = goalRect.y + goalRect.h / 2;

  ctxRef.save();
  ctxRef.strokeStyle = "rgba(255,255,255,0.12)";
  ctxRef.lineWidth = 1.5;
  ctxRef.setLineDash([6, 8]);
  ctxRef.beginPath();
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = sp.x + (targetX - sp.x) * t;
    const arc = -120 * Math.sin(Math.PI * t);
    const y = sp.y + (targetY - sp.y) * t + arc;
    if (i === 0) ctxRef.moveTo(x, y);
    else ctxRef.lineTo(x, y);
  }
  ctxRef.stroke();
  ctxRef.restore();
}

function frame(now) {
  if (!lastFrameTime) lastFrameTime = now;
  const dt = Math.min(64, now - lastFrameTime);
  lastFrameTime = now;

  const w = canvasRef.logicalW || canvasRef.width;
  const h = canvasRef.logicalH || canvasRef.height;
  ctxRef.clearRect(0, 0, w, h);

  drawAutoTrajectory();

  for (const b of balls) {
    if (!b.active) continue;
    b.update(dt, h);
    if (b.active && b.checkGoal(goalRect)) {
      b.active = false;
      if (onGoal) onGoal(b);
    } else if (!b.active) {
      b.reset();
    }
  }

  for (const b of balls) if (b.active) b.draw(ctxRef);

  rafId = requestAnimationFrame(frame);
}

export function initPhysics(state) {
  stateRef = state || getState();
  canvasRef = document.getElementById("canvas");
  ctxRef = canvasRef.getContext("2d");

  resizeCanvas();
  ensurePoolSize();

  const container = document.getElementById("pitch-container");
  if (container && window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(container);
  }
  window.addEventListener("resize", resizeCanvas);

  if (rafId) cancelAnimationFrame(rafId);
  lastFrameTime = 0;
  rafId = requestAnimationFrame(frame);
}

export function setOnGoalCallback(fn) {
  onGoal = fn;
}

export function setFloatTextCallback(fn) {
  onFloatText = fn;
}

export function launchBall(vx, vy) {
  ensurePoolSize();
  const sp = getStartPos();
  for (const b of balls) {
    if (!b.active) {
      b.reset(sp.x, sp.y);
      b.isAuto = false;
      b.launch(vx, vy);
      return true;
    }
  }
  return false;
}

function launchAutoBall() {
  ensurePoolSize();
  if (!goalRect) updateGoalRect();
  if (!goalRect) return;
  const sp = getStartPos();
  const targetX = goalRect.x + Math.random() * goalRect.w;
  const targetY = goalRect.y + goalRect.h / 2;

  const dx = targetX - sp.x;
  const dy = targetY - sp.y;
  // gentle arc — pick vy so ball arcs upward, derive time, then vx
  const vy = -Math.max(8, Math.min(16, Math.sqrt(Math.abs(dy)) * 1.4 + 6));
  const t = (-vy - Math.sqrt(vy * vy + 2 * GRAVITY * dy)) / GRAVITY;
  const vx = t > 0 ? dx / t : dx / 40;

  for (const b of balls) {
    if (!b.active) {
      b.reset(sp.x, sp.y);
      b.isAuto = true;
      b.launch(vx, vy);
      return;
    }
  }
}

export function setAutoShoot(enabled, intervalMs) {
  if (autoShootTimer) {
    clearInterval(autoShootTimer);
    autoShootTimer = null;
  }
  if (enabled && intervalMs > 0) {
    autoShootTimer = setInterval(launchAutoBall, intervalMs);
  }
}

export function triggerAutoGoalAnimation(amount) {
  if (onFloatText && goalRect) {
    const x = goalRect.x + goalRect.w / 2;
    const y = goalRect.y + goalRect.h / 2;
    onFloatText(`+$${amount}`, x, y);
  }
}

export function getBallPool() {
  return balls;
}
