// shop.js — shop panel rendering, open/close drawer, and purchase flow

import { UPGRADE_CATALOG, isUpgradeUnlocked, getUpgradeEffect, getUpgradesByCategory } from "./upgrades.js";
import { purchaseUpgrade, getUpgradeCost, canAfford, formatMoney } from "./economy.js";
import { PRESTIGE_BRACKETS } from "./constants.js";
import state from "./state.js";

let _onPurchase = null;
let _activeCategory = "all";
let _quickBuyInterval = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initShop(gameState, onPurchase) {
  _onPurchase = onPurchase;

  _injectBackdrop();
  _buildShopPanel();
  _injectQuickBuyRow();
  _wireListeners();

  _quickBuyInterval = setInterval(() => renderQuickBuy(gameState), 2000);
  renderQuickBuy(gameState);
}

function _injectBackdrop() {
  if (document.querySelector(".shop-backdrop")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "shop-backdrop";
  document.body.appendChild(backdrop);
}

function _buildShopPanel() {
  const panel = document.getElementById("shop-panel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="drag-handle"></div>
    <div class="shop-header">
      <span class="shop-title">🛒 UPGRADES</span>
      <button class="shop-close-btn" aria-label="Close shop">✕</button>
    </div>
    <div class="category-tabs">
      <button class="category-tab active" data-cat="all">All</button>
      <button class="category-tab" data-cat="manual">Manual</button>
      <button class="category-tab" data-cat="passive">Passive</button>
      <button class="category-tab" data-cat="multiplier">×Mult</button>
      <button class="category-tab" data-cat="stats">Stats</button>
    </div>
    <div class="cards-list" id="cards-list"></div>
  `;
}

function _injectQuickBuyRow() {
  if (document.querySelector(".quick-buy-row")) return;
  const row = document.createElement("div");
  row.className = "quick-buy-row";
  row.id = "quick-buy-row";
  document.body.appendChild(row);
}

function _wireListeners() {
  const panel = document.getElementById("shop-panel");
  const backdrop = document.querySelector(".shop-backdrop");
  if (!panel) return;

  panel.querySelector(".shop-close-btn").addEventListener("click", closeShop);
  backdrop?.addEventListener("click", closeShop);

  panel.addEventListener("click", (e) => {
    const btn = e.target.closest(".buy-btn");
    if (btn && !btn.disabled) {
      _handleBuy(btn.dataset.id);
    }
    const tab = e.target.closest(".category-tab");
    if (tab) {
      _setActiveTab(tab.dataset.cat);
    }
  });

  _wireDragHandle(panel);

  document.getElementById("shop-btn")?.addEventListener("click", openShop);
}

function _wireDragHandle(panel) {
  const handle = panel.querySelector(".drag-handle");
  if (!handle) return;

  let startY = 0;
  let dragging = false;

  handle.addEventListener("pointerdown", (e) => {
    dragging = true;
    startY = e.clientY;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const delta = e.clientY - startY;
    if (delta > 0) {
      panel.style.transition = "none";
      panel.style.transform = `translateY(${delta * 0.4}px)`;
    }
    if (delta > 60) {
      dragging = false;
      panel.style.transition = "";
      closeShop();
    }
  });

  handle.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = "";
    panel.style.transform = "";
  });
}

// ─── Open / Close ─────────────────────────────────────────────────────────────

export function openShop() {
  _activeCategory = "all";
  const panel = document.getElementById("shop-panel");
  const backdrop = document.querySelector(".shop-backdrop");

  panel?.classList.add("is-open");
  backdrop?.classList.add("visible");

  // reset active tab UI
  panel?.querySelectorAll(".category-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.cat === "all");
  });

  renderShop(state);
}

export function closeShop() {
  const panel = document.getElementById("shop-panel");
  const backdrop = document.querySelector(".shop-backdrop");
  panel?.classList.remove("is-open");
  panel?.style.setProperty("transform", "");
  backdrop?.classList.remove("visible");
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderShop(gameState) {
  const list = document.getElementById("cards-list");
  if (!list) return;

  const scrollTop = list.scrollTop;

  if (_activeCategory === "stats") {
    list.innerHTML = _buildStatsHTML(gameState);
    return;
  }

  const upgrades = Object.values(UPGRADE_CATALOG).filter(u => {
    if (_activeCategory === "all") return true;
    return u.category === _activeCategory;
  });

  if (upgrades.length === 0) {
    list.innerHTML = `<div class="empty-state">🔒 Keep scoring to unlock more upgrades</div>`;
    return;
  }

  list.innerHTML = upgrades.map(u => _buildCardHTML(u, gameState)).join("");
  list.scrollTop = scrollTop;
}

function _buildCardHTML(upgrade, gameState) {
  const id = upgrade.id;
  const level = gameState.upgrades[id] ?? 0;
  const isUnlocked = isUpgradeUnlocked(id, gameState);
  const isMaxed = level >= upgrade.maxLevel;
  const affordable = canAfford(gameState, id);

  const cost = getUpgradeCost(id, level);
  const discount = 1 - (gameState.upgrades.bootRoom ?? 0) * 0.05;
  const finalCost = Math.floor(cost * discount);
  const progressPct = Math.round((level / upgrade.maxLevel) * 100);
  const effectText = level > 0 ? getUpgradeEffect(id, level) : upgrade.effectLabel;

  let cardClass = "upgrade-card";
  if (!isUnlocked) cardClass += " locked";
  if (isMaxed) cardClass += " maxed";

  let footer;
  if (isMaxed) {
    footer = `<span class="max-badge">MAX ✓</span>`;
  } else if (!isUnlocked) {
    footer = `<span class="card-unlock-hint">${_unlockHint(upgrade)}</span>`;
  } else {
    footer = `
      <span class="card-cost">Cost: ${formatMoney(finalCost)}</span>
      <button class="buy-btn" data-id="${id}" ${affordable ? "" : "disabled"}>
        BUY ${formatMoney(finalCost)}
      </button>
    `;
  }

  return `
    <div class="${cardClass}" data-id="${id}">
      <div class="card-header">
        <span class="card-name">${upgrade.icon} ${upgrade.name}</span>
        <span class="card-level">Lvl ${level} / ${upgrade.maxLevel}</span>
      </div>
      <div class="card-desc">${upgrade.description}</div>
      <div class="card-effect">${effectText}</div>
      ${!isMaxed ? `
        <div class="progress-bar">
          <div class="progress-fill" style="width:${progressPct}%"></div>
        </div>
      ` : ""}
      <div class="card-footer">${footer}</div>
    </div>
  `;
}

function _unlockHint(upgrade) {
  const u = upgrade.unlockAt;
  if (!u) return "";
  if (u.goalsScored !== undefined) return `🔒 Score ${u.goalsScored} goals to unlock`;
  if (u.upgradeLevel) {
    const req = UPGRADE_CATALOG[u.upgradeLevel.id];
    return `🔒 Requires ${req?.name ?? u.upgradeLevel.id} Lvl ${u.upgradeLevel.level}`;
  }
  return "🔒 Locked";
}

function _buildStatsHTML(gameState) {
  const bracketIdx = Math.min(gameState.prestigeCount, PRESTIGE_BRACKETS.length - 1);
  const bracket = PRESTIGE_BRACKETS[bracketIdx];

  const rows = [
    ["Total Goals",    gameState.goalsScored.toLocaleString()],
    ["Total Earned",   formatMoney(gameState.totalEarned)],
    ["Income / sec",   formatMoney(gameState.passiveIncome)],
    ["Prestige Count", gameState.prestigeCount],
    ["Bracket",        `${bracket.icon} ${bracket.name}`],
  ];

  return `
    <div class="stats-table">
      ${rows.map(([label, value]) => `
        <div class="stats-row">
          <span class="stats-label">${label}</span>
          <span class="stats-value">${value}</span>
        </div>
      `).join("")}
    </div>
  `;
}

// ─── Buy flow ─────────────────────────────────────────────────────────────────

function _handleBuy(upgradeId) {
  const success = purchaseUpgrade(state, upgradeId);
  const card = document.querySelector(`.upgrade-card[data-id="${upgradeId}"]`);

  if (success) {
    if (card) {
      card.classList.add("buying");
      setTimeout(() => card.classList.remove("buying"), 400);
    }
    if (typeof _onPurchase === "function") _onPurchase(upgradeId);
    renderShop(state);
    renderQuickBuy(state);
  } else {
    if (card) {
      card.classList.add("shake");
      setTimeout(() => card.classList.remove("shake"), 180);
    }
  }
}

// ─── Category tabs ────────────────────────────────────────────────────────────

function _setActiveTab(cat) {
  _activeCategory = cat;
  document.querySelectorAll(".category-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.cat === cat);
  });
  renderShop(state);
}

// ─── Quick-buy row ────────────────────────────────────────────────────────────

export function renderQuickBuy(gameState) {
  const row = document.getElementById("quick-buy-row");
  if (!row) return;

  const all = Object.values(UPGRADE_CATALOG);

  const affordable = all.filter(u => {
    const level = gameState.upgrades[u.id] ?? 0;
    return level < u.maxLevel && isUpgradeUnlocked(u.id, gameState) && canAfford(gameState, u.id);
  }).sort((a, b) => {
    const costA = getUpgradeCost(a.id, gameState.upgrades[a.id] ?? 0);
    const costB = getUpgradeCost(b.id, gameState.upgrades[b.id] ?? 0);
    return costA - costB;
  });

  const locked = all.filter(u => {
    const level = gameState.upgrades[u.id] ?? 0;
    return level < u.maxLevel && (!isUpgradeUnlocked(u.id, gameState) || !canAfford(gameState, u.id));
  }).sort((a, b) => {
    const costA = getUpgradeCost(a.id, gameState.upgrades[a.id] ?? 0);
    const costB = getUpgradeCost(b.id, gameState.upgrades[b.id] ?? 0);
    return costA - costB;
  });

  const pills = [...affordable.slice(0, 2), ...locked.slice(0, Math.max(0, 2 - affordable.length))].slice(0, 2);

  row.innerHTML = pills.map(u => {
    const level = gameState.upgrades[u.id] ?? 0;
    const cost = getUpgradeCost(u.id, level);
    const discount = 1 - (gameState.upgrades.bootRoom ?? 0) * 0.05;
    const finalCost = Math.floor(cost * discount);
    const isAffordable = canAfford(gameState, u.id) && isUpgradeUnlocked(u.id, gameState);
    return `
      <button class="quick-buy-pill" data-id="${u.id}" ${isAffordable ? "" : "disabled"}>
        ${u.icon} ${u.name} ${formatMoney(finalCost)}
      </button>
    `;
  }).join("");

  row.querySelectorAll(".quick-buy-pill:not([disabled])").forEach(btn => {
    btn.addEventListener("click", () => _handleBuy(btn.dataset.id));
  });
}

export default { initShop, openShop, closeShop, renderShop, renderQuickBuy };
