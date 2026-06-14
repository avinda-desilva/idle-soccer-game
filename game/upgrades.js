export const UPGRADE_CATALOG = {
  extraBalls: {
    id: "extraBalls",
    name: "Extra Ball",
    icon: "🟡",
    description: "More balls on the pitch. Increase your manual scoring rate.",
    baseCost: 10,
    costScaling: 1.4,
    maxLevel: 10,
    unlockAt: null,
    effectLabel: "+1 ball",
    category: "manual"
  },

  autoShooter: {
    id: "autoShooter",
    name: "Auto Shooter",
    icon: "🤖",
    description: "AI striker scores goals for you. Passive income scales with level.",
    baseCost: 50,
    costScaling: 1.35,
    maxLevel: 20,
    unlockAt: { goalsScored: 5 },
    effectLabel: "+0.5 goals/sec",
    category: "passive"
  },

  goalExpander: {
    id: "goalExpander",
    name: "Bigger Goal",
    icon: "🥅",
    description: "Widen the net. Easier to score, more chances per swipe.",
    baseCost: 25,
    costScaling: 1.3,
    maxLevel: 15,
    unlockAt: { goalsScored: 3 },
    effectLabel: "+40px wide",
    category: "manual"
  },

  richBall: {
    id: "richBall",
    name: "Golden Ball",
    icon: "✨",
    description: "Each goal is worth more. Multiplies manual and auto income.",
    baseCost: 75,
    costScaling: 1.5,
    maxLevel: 10,
    unlockAt: { goalsScored: 10 },
    effectLabel: "+50% per goal",
    category: "multiplier"
  },

  fanCheer: {
    id: "fanCheer",
    name: "Fan Energy",
    icon: "📣",
    description: "The crowd energizes you. Boosts manual swipe income.",
    baseCost: 30,
    costScaling: 1.35,
    maxLevel: 15,
    unlockAt: { goalsScored: 8 },
    effectLabel: "+20% manual income",
    category: "multiplier"
  },

  sponsorDeal: {
    id: "sponsorDeal",
    name: "Sponsor Deal",
    icon: "📺",
    description: "Sign a shirt sponsor. Pure passive income, no effort required.",
    baseCost: 200,
    costScaling: 1.4,
    maxLevel: 10,
    unlockAt: { goalsScored: 20 },
    effectLabel: "+$5/sec",
    category: "passive"
  },

  stadiumLevel: {
    id: "stadiumLevel",
    name: "Stadium Upgrade",
    icon: "🏟️",
    description: "Upgrade your stadium. Massively boosts all income sources.",
    baseCost: 500,
    costScaling: 1.6,
    maxLevel: 5,
    unlockAt: { upgradeLevel: { id: "sponsorDeal", level: 1 } },
    effectLabel: "+$25/sec + ×prestige",
    category: "passive"
  },

  weatherEffect: {
    id: "weatherEffect",
    name: "Wet Pitch",
    icon: "🌧️",
    description: "Rain makes balls travel faster. Auto-shooter fires 25% quicker.",
    baseCost: 150,
    costScaling: 1.4,
    maxLevel: 5,
    unlockAt: { goalsScored: 50 },
    effectLabel: "-25% auto interval",
    category: "passive"
  },

  VAR_system: {
    id: "VAR_system",
    name: "VAR Review",
    icon: "📹",
    description: "10% chance any goal is reviewed and doubled. VAR always confirms.",
    baseCost: 1000,
    costScaling: 2.0,
    maxLevel: 3,
    unlockAt: { goalsScored: 100 },
    effectLabel: "+10% double chance",
    category: "multiplier"
  },

  multiGoal: {
    id: "multiGoal",
    name: "Multi-Goal Net",
    icon: "🕸️",
    description: "Two goals count per auto-score event. Doubles auto income.",
    baseCost: 800,
    costScaling: 1.5,
    maxLevel: 5,
    unlockAt: { upgradeLevel: { id: "goalExpander", level: 5 } },
    effectLabel: "×2 auto goals",
    category: "passive"
  },

  cornerKick: {
    id: "cornerKick",
    name: "Corner Kick Bot",
    icon: "📐",
    description: "Fires 3 balls simultaneously every 10 seconds.",
    baseCost: 400,
    costScaling: 1.45,
    maxLevel: 5,
    unlockAt: { upgradeLevel: { id: "autoShooter", level: 3 } },
    effectLabel: "burst ×3 / 10sec",
    category: "passive"
  },

  transferMarket: {
    id: "transferMarket",
    name: "Transfer Market",
    icon: "💰",
    description: "Sell players for profit. Massive flat passive income.",
    baseCost: 2500,
    costScaling: 1.5,
    maxLevel: 10,
    unlockAt: { upgradeLevel: { id: "stadiumLevel", level: 3 } },
    effectLabel: "+$50/sec",
    category: "passive"
  },

  stadiumAds: {
    id: "stadiumAds",
    name: "Ad Boards",
    icon: "📊",
    description: "Pitch-side ads scale with your goals. Passive income grows over time.",
    baseCost: 300,
    costScaling: 1.4,
    maxLevel: 10,
    unlockAt: { upgradeLevel: { id: "stadiumLevel", level: 1 } },
    effectLabel: "+$2/sec × log(goals)",
    category: "passive"
  },

  bootRoom: {
    id: "bootRoom",
    name: "Boot Room",
    icon: "👟",
    description: "Optimize your spending. Reduces all upgrade costs by 5% per level.",
    baseCost: 100,
    costScaling: 1.5,
    maxLevel: 5,
    unlockAt: { goalsScored: 15 },
    effectLabel: "-5% upgrade costs",
    category: "multiplier"
  }
};

export function getUpgradesByCategory(category) {
  return Object.values(UPGRADE_CATALOG).filter(upgrade => upgrade.category === category);
}

export function isUpgradeUnlocked(upgradeId, state) {
  const upgrade = UPGRADE_CATALOG[upgradeId];
  if (!upgrade || !upgrade.unlockAt) return true;

  if (upgrade.unlockAt.goalsScored !== undefined) {
    return state.goalsScored >= upgrade.unlockAt.goalsScored;
  }

  if (upgrade.unlockAt.upgradeLevel) {
    const { id, level } = upgrade.unlockAt.upgradeLevel;
    const upgradeLevelInState = state.upgrades?.[id] || 0;
    return upgradeLevelInState >= level;
  }

  return true;
}

export function getUpgradeEffect(upgradeId, level) {
  const upgrade = UPGRADE_CATALOG[upgradeId];
  if (!upgrade) return "";

  const effectValue = level * parseEffectQuantity(upgrade.effectLabel);
  return `${upgrade.effectLabel.match(/[^\d.-]/g).join("")} (${formatEffect(effectValue)})`;
}

function parseEffectQuantity(label) {
  const match = label.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 1;
}

function formatEffect(value) {
  if (value >= 1000) return (value / 1000).toFixed(1) + "k";
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

export default UPGRADE_CATALOG;
