// physics.js — ball trajectory, velocity, and collision calculations

import { GRAVITY } from "./constants.js";
import { getState } from "./state.js";

const BALL_RADIUS = 14;
const MAX_BALLS = 10;
const RESPAWN_DELAY_OFFSCREEN_MS = 600;
const RESPAWN_DELAY_GOAL_MS = 2000;
const SWIPE_HIT_PADDING = 18;          // extra forgiveness around the ball
const SWIPE_SPEED_MULT = 0.045;        // px/ms → ball velocity units
const MAX_LAUNCH_SPEED = 38;
const MIN_LAUNCH_SPEED = 8;

const PATCH_OFFSETS = [
  { dx: 0, dy: 0, r: 3.2 },
  { dx: 7, dy: -4, r: 2.4 },
  { dx: -7, dy: -4, r: 2.4 },
  { dx: 7, dy: 5, r: 2.4 },
  { dx: -7, dy: 5, r: 2.4 },
  { dx: 0, dy: 9, r: 2.4 },
];

class Ball {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = BALL_RADIUS;
    this.resting = true;     // sitting on the pitch, swipe-able
    this.flying = false;     // launched, subject to gravity
    this.isAuto = false;
    this.transient = false;  // true → don't respawn, delete when done
    this.dead = false;       // true → frame loop should remove from pool
    this.respawnAt = 0;      // 0 = no pending respawn, otherwise timestamp
  }

  launch(vx, vy) {
    this.vx = vx;
    this.vy = vy;
    this.resting = false;
    this.flying = true;
  }

  update(dt, logicalW, logicalH) {
    if (!this.flying) return;
    const step = dt / 16.6667;
    this.vy += GRAVITY * step;
    this.x += this.vx * step;
    this.y += this.vy * step;

    // Off-screen
    if (
      this.y > logicalH + 60 ||
      this.y < -120 ||                 // flew past the top (above goal)
      this.x < -60 ||
      this.x > logicalW + 60
    ) {
      this.flying = false;
      if (this.transient) {
        this.dead = true;              // auto/corner ball — remove from pool
      } else {
        this.scheduleRespawn(RESPAWN_DELAY_OFFSCREEN_MS);
      }
    }
  }

  draw(ctx) {
    if (this.resting) {
      // subtle shadow for resting ball
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + this.radius + 4, this.radius * 0.9, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (!this.resting && !this.flying) return;

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

  scheduleRespawn(delayMs) {
    this.flying = false;
    this.resting = false;
    this.respawnAt = performance.now() + delayMs;
  }

  respawnAt_(pos) {
    this.x = pos.x;
    this.y = pos.y;
    this.vx = 0;
    this.vy = 0;
    this.resting = true;
    this.flying = false;
    this.isAuto = false;
    this.respawnAt = 0;
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
let autoShootCount = 1;
let resizeObserver = null;

function logicalSize() {
  if (!canvasRef) return { w: 0, h: 0 };
  return {
    w: canvasRef.logicalW || canvasRef.width,
    h: canvasRef.logicalH || canvasRef.height,
  };
}

function randomRestingPosition() {
  // Resting balls live in the bottom half, spread horizontally
  const { w, h } = logicalSize();
  const marginX = 60;
  const x = marginX + Math.random() * (w - marginX * 2);
  const yMin = h * 0.6;
  const yMax = h - 90;
  const y = yMin + Math.random() * (yMax - yMin);
  return { x, y };
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
  canvasRef.logicalW = w;
  canvasRef.logicalH = h;

  // Keep resting balls inside the new bounds; if outside, respawn-in-place
  for (const b of balls) {
    if (b.resting) {
      if (b.x > w - 30 || b.x < 30 || b.y > h - 60 || b.y < h * 0.55) {
        b.respawnAt_(randomRestingPosition());
      }
    }
  }
  updateGoalRect();
}

function ensurePoolSize() {
  if (!stateRef) return;
  const target = Math.min(MAX_BALLS, Math.max(1, stateRef.ballCount || 1));

  let ownedCount = balls.reduce((n, b) => n + (b.transient ? 0 : 1), 0);

  while (ownedCount < target) {
    const b = new Ball();
    b.respawnAt_(randomRestingPosition());
    balls.push(b);
    ownedCount++;
  }

  // If the player's pool needs to shrink, drop the oldest non-transient balls.
  while (ownedCount > target) {
    const idx = balls.findIndex(b => !b.transient);
    if (idx < 0) break;
    balls.splice(idx, 1);
    ownedCount--;
  }
}

export function updateGoalRect() {
  const goalEl = document.getElementById("goal");
  if (!goalEl || !canvasRef) {
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
  const { w, h } = logicalSize();
  const sp = { x: w / 2, y: h - 80 };
  const targetX = goalRect.x + goalRect.w / 2;
  const targetY = goalRect.y + goalRect.h / 2;

  ctxRef.save();
  ctxRef.strokeStyle = "rgba(255,255,255,0.10)";
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

  const { w, h } = logicalSize();
  ctxRef.clearRect(0, 0, w, h);

  drawAutoTrajectory();

  for (const b of balls) {
    // Pending respawn → wait then place (player-owned balls only)
    if (b.respawnAt && now >= b.respawnAt && !b.transient) {
      b.respawnAt_(randomRestingPosition());
    }

    if (b.flying) {
      b.update(dt, w, h);
      if (b.flying && b.checkGoal(goalRect)) {
        b.flying = false;
        b.resting = false;
        if (onGoal) onGoal(b);
        if (b.transient) {
          b.dead = true;            // auto/corner ball — gone after scoring
        } else {
          b.respawnAt = performance.now() + RESPAWN_DELAY_GOAL_MS;
        }
      }
    }

    if (!b.dead) b.draw(ctxRef);
  }

  // Sweep out dead transient balls so the pool can't grow unbounded.
  for (let i = balls.length - 1; i >= 0; i--) {
    if (balls[i].dead) balls.splice(i, 1);
  }

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

export function setOnGoalCallback(fn) { onGoal = fn; }
export function setFloatTextCallback(fn) { onFloatText = fn; }

// Re-sync pool to match state.ballCount (call after an extraBalls purchase)
export function syncBallPool() {
  ensurePoolSize();
}

// Distance from point P to segment AB (in canvas-logical coords)
function distPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * The user's swipe is supplied as a path in PAGE (clientX/clientY) coordinates
 * along with the elapsed time. We convert to canvas-logical coords, find any
 * resting balls the swipe passed through, and launch them with a velocity
 * derived from the swipe direction and speed.
 *
 * @param {{x:number,y:number}[]} path  pointer samples (page coords)
 * @param {number} elapsedMs
 * @returns {number} count of balls launched
 */
export function applySwipe(path, elapsedMs) {
  if (!path || path.length < 2 || !canvasRef) return 0;
  const cb = canvasRef.getBoundingClientRect();
  // Convert path to canvas-logical coords
  const pts = path.map(p => ({ x: p.x - cb.left, y: p.y - cb.top }));

  // Overall direction (start → end)
  const sx = pts[0].x;
  const sy = pts[0].y;
  const ex = pts[pts.length - 1].x;
  const ey = pts[pts.length - 1].y;
  const dx = ex - sx;
  const dy = ey - sy;
  const dist = Math.hypot(dx, dy);
  if (dist < 8) return 0;

  // Speed in "ball units" — px/ms × multiplier
  let speed = (dist / Math.max(1, elapsedMs)) * 1000 * SWIPE_SPEED_MULT;
  speed = Math.max(MIN_LAUNCH_SPEED, Math.min(MAX_LAUNCH_SPEED, speed));

  // Direction unit vector
  const nx = dx / dist;
  const ny = dy / dist;

  // Only allow launches with an upward component (the goal is at the top)
  if (ny > -0.15) return 0;

  let launched = 0;
  for (const b of balls) {
    if (!b.resting) continue;

    // Check whether the swipe path passes near this resting ball
    let near = false;
    const threshold = b.radius + SWIPE_HIT_PADDING;
    for (let i = 1; i < pts.length; i++) {
      const d = distPointToSegment(
        b.x, b.y,
        pts[i - 1].x, pts[i - 1].y,
        pts[i].x, pts[i].y,
      );
      if (d <= threshold) { near = true; break; }
    }
    if (!near) continue;

    b.launch(nx * speed, ny * speed);
    launched++;
  }

  return launched;
}

// Direct launch helper — used by the cornerKick burst. Always spawns a
// transient ball so the player's resting pool is never disturbed.
export function launchBall(vx, vy) {
  if (!canvasRef) return false;
  const { w, h } = logicalSize();
  const b = new Ball();
  b.x = w / 2;
  b.y = h - 80;
  b.resting = false;
  b.transient = true;
  b.launch(vx, vy);
  balls.push(b);
  return true;
}

function launchAutoBall() {
  if (!goalRect) updateGoalRect();
  if (!goalRect || !canvasRef) return;
  const { h } = logicalSize();
  const sp = { x: canvasRef.logicalW / 2, y: h - 80 };

  // Aim for goal center; solve ballistics so the apex sits above the goal.
  const targetX = goalRect.x + goalRect.w / 2;
  const targetY = goalRect.y + goalRect.h / 2;

  const dx = targetX - sp.x;
  const dy = targetY - sp.y;          // negative (target is above)

  // Choose flight time based on vertical distance — guaranteed to reach.
  const flightTime = Math.sqrt(Math.max(40, -dy) / GRAVITY) * 2.2;
  const vx = dx / flightTime;
  // vy from kinematics: dy = vy*t + 0.5*g*t^2  =>  vy = (dy - 0.5*g*t^2)/t
  const vy = (dy - 0.5 * GRAVITY * flightTime * flightTime) / flightTime;

  // Spawn a transient auto-ball that doesn't consume the resting pool.
  // Transient balls auto-delete on score or when they leave the screen.
  const ball = new Ball();
  ball.x = sp.x;
  ball.y = sp.y;
  ball.resting = false;
  ball.isAuto = true;
  ball.transient = true;
  ball.launch(vx, vy);
  balls.push(ball);
}

function autoTick() {
  for (let i = 0; i < autoShootCount; i++) {
    // Slight stagger between simultaneous shots
    setTimeout(launchAutoBall, i * 90);
  }
}

export function setAutoShoot(enabled, intervalMs, count = 1) {
  if (autoShootTimer) {
    clearInterval(autoShootTimer);
    autoShootTimer = null;
  }
  autoShootCount = Math.max(1, count | 0);
  if (enabled && intervalMs > 0) {
    autoShootTimer = setInterval(autoTick, intervalMs);
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
