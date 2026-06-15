// state.js — single source of truth for all mutable game state

import {
  GOAL_MIN_WIDTH,
  GOAL_MIN_HEIGHT,
  GOAL_MAX_WIDTH,
  GOAL_MAX_HEIGHT,
  GOAL_WIDTH_PER_UPGRADE,
  GOAL_HEIGHT_PER_UPGRADE,
  BASE_GOAL_VALUE,
} from "./constants.js";
import {
  calcMoneyPerGoal,
  calcTotalPassiveIncome,
} from "./economy.js";

export const DEFAULT_STATE = {
  money: 0,
  totalEarned: 0,
  moneyPerGoal: BASE_GOAL_VALUE,
  passiveIncome: 0,

  goalsScored: 0,
  ballCount: 1,
  swipeActive: false,

  goalWidth: GOAL_MIN_WIDTH,
  goalHeight: GOAL_MIN_HEIGHT,

  upgrades: {
    extraBalls: 0,
    autoShooter: 0,
    goalExpander: 0,
    richBall: 0,
    fanCheer: 0,
    sponsorDeal: 0,
    stadiumLevel: 0,
    weatherEffect: 0,
    VAR_system: 0,
    multiGoal: 0,
    cornerKick: 0,
    transferMarket: 0,
    stadiumAds: 0,
    bootRoom: 0,
  },

  prestigeCount: 0,
  prestigeMultiplier: 1.0,

  unlockedFanMilestones: [],

  lastSaved: null,
  version: "1.0.0",
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const state = deepClone(DEFAULT_STATE);

export function resetState() {
  const fresh = deepClone(DEFAULT_STATE);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, fresh);
  return state;
}

export function getState() {
  return state;
}

export function recalcDerivedState(s = state) {
  const u = s.upgrades;

  s.moneyPerGoal = calcMoneyPerGoal(s);
  s.passiveIncome = calcTotalPassiveIncome(s);
  s.ballCount = 1 + (u.extraBalls || 0);

  s.goalWidth = Math.min(
    GOAL_MAX_WIDTH,
    GOAL_MIN_WIDTH + u.goalExpander * GOAL_WIDTH_PER_UPGRADE,
  );
  s.goalHeight = Math.min(
    GOAL_MAX_HEIGHT,
    GOAL_MIN_HEIGHT + u.goalExpander * GOAL_HEIGHT_PER_UPGRADE,
  );

  return s;
}

export default state;
