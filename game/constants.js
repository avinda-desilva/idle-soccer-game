// constants.js — shared numeric constants and configuration values

// Physics
export const GRAVITY = 0.4;
export const POWER_FACTOR = 0.85;
export const MIN_SWIPE_PX = 40;
export const MAX_SWIPE_SPEED = 40;

// Timing
export const TICK_INTERVAL_MS = 100;
export const AUTOSAVE_INTERVAL_MS = 5000;
export const AUTO_SHOOT_BASE_RATE_MS = 2000;
export const OFFLINE_CAP_HOURS = 8;

// Economy
export const BASE_GOAL_VALUE = 1;
export const COST_SCALE = 1.35;
export const PRESTIGE_THRESHOLD = 1_000_000;
export const PRESTIGE_BONUS = 0.25;
export const VAR_CHANCE = 0.10;

// Goal dimensions
export const GOAL_MIN_WIDTH = 120;
export const GOAL_MAX_WIDTH = 600;
export const GOAL_MIN_HEIGHT = 80;
export const GOAL_MAX_HEIGHT = 280;
export const GOAL_WIDTH_PER_UPGRADE = 40;
export const GOAL_HEIGHT_PER_UPGRADE = 20;

// Fan milestones (goals scored thresholds → unlock flat $/sec)
export const FAN_MILESTONES = [
  { goals: 10,     income: 2,    label: "500 fans",        emoji: "👥" },
  { goals: 100,    income: 20,   label: "10,000 fans",     emoji: "🎉" },
  { goals: 1000,   income: 100,  label: "50,000 fans",     emoji: "🏟️" },
  { goals: 10000,  income: 250,  label: "100,000 fans",    emoji: "🌍" },
  { goals: 100000, income: 1000, label: "World Cup crowd", emoji: "🏆" },
];

// Prestige brackets
export const PRESTIGE_BRACKETS = [
  { name: "Group Stage",    icon: "⚽",  multiplier: 1.0  },
  { name: "Round of 16",    icon: "🥉", multiplier: 1.25 },
  { name: "Quarter-Final",  icon: "🥈", multiplier: 1.5  },
  { name: "Semi-Final",     icon: "🎖️", multiplier: 1.75 },
  { name: "The Final",      icon: "🥇", multiplier: 2.0  },
  { name: "Champion",       icon: "🏆", multiplier: 2.5  },
];
