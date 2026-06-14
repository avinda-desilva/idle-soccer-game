# Goal Rush

A minimalist idle clicker soccer game. Swipe to shoot, earn coins per goal, buy upgrades to score faster and unlock passive income.

## Tech stack

- Vanilla JavaScript (ES Modules, no build step)
- HTML5 Canvas for ball animations
- CSS custom properties for theming
- Google Fonts: Oswald + Inter
- localStorage for persistence

## How to run

Open `goal-rush/index.html` directly in a browser, or serve the repo root with any static file server:

```sh
npx serve .
# then open http://localhost:3000/goal-rush/
```

No install step required.

## Project structure

```
goal-rush/
├── index.html          # Entry point
├── style.css           # All styles (tokens, pitch, HUD, shop panel)
└── game/
    ├── constants.js    # Shared numeric constants
    ├── state.js        # Mutable game state
    ├── engine.js       # Main loop + module orchestration
    ├── physics.js      # Ball trajectory & collisions
    ├── gestures.js     # Swipe detection & power scoring
    ├── economy.js      # Currency & passive income
    ├── upgrades.js     # Upgrade definitions & effects
    ├── ui.js           # DOM / HUD updates
    ├── shop.js         # Shop drawer & purchase flow
    ├── prestige.js     # Prestige resets & multipliers
    └── persistence.js  # Save / load via localStorage
```
