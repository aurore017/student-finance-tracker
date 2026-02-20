const KEY_DATA = "glowbudget:data:v1";
const KEY_SETTINGS = "glowbudget:settings:v1";

export function loadData() {
  try {
    return JSON.parse(localStorage.getItem(KEY_DATA) || "[]");
  } catch {
    return [];
  }
}

export function saveData(records) {
  localStorage.setItem(KEY_DATA, JSON.stringify(records));
}

export function loadSettings() {
  const defaults = {
    theme: "light", // NEW: "light" | "dark"
    displayCurrency: "RWF",
    rates: { USD: 1300, EUR: 1400 }, // 1 USD/EUR in RWF
    monthlyCapRWF: 0,
    categories: ["Food", "Books", "Transport", "Entertainment", "Fees", "Other"]
  };

  try {
    const raw = JSON.parse(localStorage.getItem(KEY_SETTINGS) || "null");
    if (!raw || typeof raw !== "object") return defaults;

    const merged = {
      ...defaults,
      ...raw,
      rates: { ...defaults.rates, ...(raw.rates || {}) },
      categories: Array.isArray(raw.categories) ? raw.categories : defaults.categories
    };

    if (merged.theme !== "dark") merged.theme = "light";
    return merged;
  } catch {
    return defaults;
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
}

export function resetAll() {
  localStorage.removeItem(KEY_DATA);
  localStorage.removeItem(KEY_SETTINGS);
}