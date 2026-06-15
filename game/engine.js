// engine.js — main game loop, initialisation, and module orchestration

import { AUTOSAVE_INTERVAL_MS, AUTO_SHOOT_BASE_RATE_MS, OFFLINE_CAP_HOURS } from './constants.js';
import state from './state.js';
import {
  initPhysics, setOnGoalCallback, setAutoShoot,
  launchBall, updateGoalRect, syncBallPool,
} from './physics.js';
import { recalcDerivedState } from './state.js';
import { initGestures } from './gestures.js';
import {
  initUI, updateHUD, spawnFloatingText, showToast,
  showVARFlash, showGoalPulse, showOfflineModal,
} from './ui.js';
import { initShop, renderShop } from './shop.js';
import {
  initGameTick, onGoalScored, rollVAR,
  checkFanMilestones, calcTotalPassiveIncome,
} from './economy.js';
import { saveGame, loadGame } from './persistence.js';

let cornerKickInterval = null;
let autosaveInterval = null;
let tickCount = 0;

async function initGame() {
  const saved = loadGame();
  if (saved) Object.assign(state, saved);

  // Derive ballCount/passiveIncome/goalSize from loaded upgrades before init.
  recalcDerivedState(state);

  if (state.lastSaved && state.passiveIncome > 0) {
    const secondsAway = (Date.now() - state.lastSaved) / 1000;
    const cappedSeconds = Math.min(secondsAway, OFFLINE_CAP_HOURS * 3600);
    const earned = state.passiveIncome * cappedSeconds;
    if (earned > 1) showOfflineModal(earned, secondsAway);
    state.money += earned;
  }

  initUI(state);
  initPhysics(state);
  initGestures(state, onSwipe);
  initShop(state, onUpgradePurchased);

  setOnGoalCallback(handleGoalScored);

  initGameTick(state, onTick);

  autosaveInterval = setInterval(() => saveGame(state), AUTOSAVE_INTERVAL_MS);
  window.addEventListener('beforeunload', () => saveGame(state));

  syncIdleSystems();

  updateHUD(state);
}

function handleGoalScored(isAuto = false) {
  const isVAR = rollVAR(state);
  const value = onGoalScored(state, isVAR);

  if (isVAR) showVARFlash();
  showGoalPulse();
  spawnFloatingText(value, isVAR);

  const newMilestones = checkFanMilestones(state);
  newMilestones.forEach(m => {
    showToast(`${m.label} reached!`, m.emoji, `+$${m.income}/sec unlocked`);
  });

  updateHUD(state);
}

function onSwipe(launchedCount) {
  // Physics handles the launch directly inside applySwipe; nothing else
  // to do here today (could play a "kick" sound or analytics event).
}

function onUpgradePurchased(upgradeId) {
  syncIdleSystems();
  updateGoalRect();
  updateHUD(state);
  renderShop(state);
}

function syncIdleSystems() {
  recalcDerivedState(state);
  syncBallPool();

  if (state.upgrades.autoShooter > 0) {
    const weatherBonus = 1 - (state.upgrades.weatherEffect * 0.25);
    // Each level fires one extra simultaneous shot, on a fixed cadence.
    const intervalMs = AUTO_SHOOT_BASE_RATE_MS * weatherBonus;
    setAutoShoot(true, Math.max(intervalMs, 500), state.upgrades.autoShooter);
  } else {
    setAutoShoot(false);
  }

  clearInterval(cornerKickInterval);
  cornerKickInterval = null;
  if (state.upgrades.cornerKick > 0) {
    cornerKickInterval = setInterval(() => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const vx = (Math.random() - 0.5) * 3;
          launchBall(vx, -18);
          handleGoalScored(true);
        }, i * 180);
      }
    }, 10000);
  }

  state.passiveIncome = calcTotalPassiveIncome(state);
}

function onTick() {
  updateHUD(state);
  tickCount++;
  if (tickCount % 10 === 0) {
    renderShop(state);
  }
}

document.addEventListener('DOMContentLoaded', initGame);

export { initGame, syncIdleSystems, handleGoalScored };
