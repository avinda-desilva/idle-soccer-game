// upgrades.js — upgrade definitions, purchase logic, and effect application

import { COST_SCALE } from "./constants.js";

export const UPGRADE_CATALOG = {
  extraBalls:    { baseCost: 50,     costScaling: COST_SCALE, maxLevel: 10  },
  autoShooter:   { baseCost: 25,     costScaling: COST_SCALE, maxLevel: 100 },
  goalExpander:  { baseCost: 100,    costScaling: COST_SCALE, maxLevel: 12  },
  richBall:      { baseCost: 75,     costScaling: COST_SCALE, maxLevel: 50  },
  fanCheer:      { baseCost: 40,     costScaling: COST_SCALE, maxLevel: 50  },
  sponsorDeal:   { baseCost: 200,    costScaling: COST_SCALE, maxLevel: 50  },
  stadiumLevel:  { baseCost: 1000,   costScaling: COST_SCALE, maxLevel: 25  },
  weatherEffect: { baseCost: 500,    costScaling: COST_SCALE, maxLevel: 10  },
  VAR_system:    { baseCost: 2500,   costScaling: COST_SCALE, maxLevel: 5   },
  multiGoal:     { baseCost: 5000,   costScaling: COST_SCALE, maxLevel: 3   },
  cornerKick:    { baseCost: 1500,   costScaling: COST_SCALE, maxLevel: 10  },
  transferMarket:{ baseCost: 10000,  costScaling: COST_SCALE, maxLevel: 20  },
  stadiumAds:    { baseCost: 7500,   costScaling: COST_SCALE, maxLevel: 20  },
  bootRoom:      { baseCost: 25000,  costScaling: COST_SCALE, maxLevel: 15  },
};

export default {};
