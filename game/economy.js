// economy.js — currency accumulation, passive income ticks, and reward calculation

import {
  BASE_GOAL_VALUE,
  FAN_MILESTONES,
  TICK_INTERVAL_MS,
  VAR_CHANCE,
} from "./constants.js";
import { recalcDerivedState } from "./state.js";
import { UPGRADE_CATALOG } from "./upgrades.js";

export function calcMoneyPerGoal(state) {
  const richMult = 1 + state.upgrades.richBall * 0.5;
  const cheerMult = 1 + state.upgrades.fanCheer * 0.2;
  return BASE_GOAL_VALUE * richMult * cheerMult * state.prestigeMultiplier;
}

export function calcAutoShooterIncome(state) {
  return state.upgrades.autoShooter * 0.5 * calcMoneyPerGoal(state);
}

export function calcSponsorIncome(state) {
  return state.upgrades.sponsorDeal * 5;
}

export function calcStadiumIncome(state) {
  return state.upgrades.stadiumLevel * 25 * state.prestigeMultiplier;
}

export function calcAdIncome(state) {
  return state.upgrades.stadiumAds * 2 * Math.log10(state.goalsScored + 1);
}

export function calcTransferIncome(state) {
  return state.upgrades.transferMarket * 50;
}

export function calcFanIncome(state) {
  return FAN_MILESTONES
    .filter((_, i) => state.unlockedFanMilestones.includes(i))
    .reduce((sum, m) => sum + m.income, 0);
}

export function calcTotalPassiveIncome(state) {
  return (
    calcAutoShooterIncome(state) +
    calcSponsorIncome(state) +
    calcStadiumIncome(state) +
    calcAdIncome(state) +
    calcTransferIncome(state) +
    calcFanIncome(state)
  );
}

export function checkFanMilestones(state) {
  const newlyUnlocked = [];
  FAN_MILESTONES.forEach((milestone, i) => {
    if (
      !state.unlockedFanMilestones.includes(i) &&
      state.goalsScored >= milestone.goals
    ) {
      state.unlockedFanMilestones.push(i);
      newlyUnlocked.push({ ...milestone, index: i });
    }
  });
  return newlyUnlocked;
}

export function onGoalScored(state, isVAR = false) {
  const value = calcMoneyPerGoal(state) * (isVAR ? 2 : 1);
  state.money += value;
  state.totalEarned += value;
  state.goalsScored += 1;
  state.moneyPerGoal = calcMoneyPerGoal(state);
  checkFanMilestones(state);
  return value;
}

export function rollVAR(state) {
  if (state.upgrades.VAR_system === 0) return false;
  const chance = VAR_CHANCE * state.upgrades.VAR_system;
  return Math.random() < chance;
}

export function initGameTick(state, onTick) {
  const ticksPerSecond = 1000 / TICK_INTERVAL_MS;
  const intervalId = setInterval(() => {
    recalcDerivedState(state);
    const increment = state.passiveIncome / ticksPerSecond;
    state.money += increment;
    state.totalEarned += increment;
    if (typeof onTick === "function") {
      onTick({ passiveIncome: state.passiveIncome, money: state.money });
    }
  }, TICK_INTERVAL_MS);
  return intervalId;
}

export function getUpgradeCost(upgradeId, currentLevel) {
  const upgrade = UPGRADE_CATALOG[upgradeId];
  if (!upgrade) return Infinity;
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, currentLevel));
}

export function canAfford(state, upgradeId) {
  const cost = getUpgradeCost(upgradeId, state.upgrades[upgradeId]);
  const discount = 1 - state.upgrades.bootRoom * 0.05;
  const finalCost = Math.floor(cost * discount);
  return state.money >= finalCost;
}

export function purchaseUpgrade(state, upgradeId) {
  const upgrade = UPGRADE_CATALOG[upgradeId];
  if (!upgrade) return false;
  if (state.upgrades[upgradeId] >= upgrade.maxLevel) return false;

  const cost = getUpgradeCost(upgradeId, state.upgrades[upgradeId]);
  const discount = 1 - state.upgrades.bootRoom * 0.05;
  const finalCost = Math.floor(cost * discount);

  if (state.money < finalCost) return false;

  state.money -= finalCost;
  state.upgrades[upgradeId] += 1;
  recalcDerivedState(state);
  return true;
}

export function formatMoney(n) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}
