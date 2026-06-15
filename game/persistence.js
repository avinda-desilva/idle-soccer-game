// persistence.js — localStorage save/load, serialisation, and auto-save scheduling

const STORAGE_KEY = 'goalRush.save';

export function saveGame(state) {
  try {
    state.lastSaved = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('saveGame failed', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('loadGame failed', e);
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(STORAGE_KEY);
}
