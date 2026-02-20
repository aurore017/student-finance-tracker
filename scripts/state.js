import { loadData, saveData, loadSettings, saveSettings } from "./storage.js";

export const state = {
  records: loadData(),
  settings: loadSettings(),
  ui: {
    sort: "dateDesc",
    categoryFilter: "All",
    searchText: "",
    searchCase: false
  }
};

export function commitRecords(nextRecords) {
  state.records = nextRecords;
  saveData(state.records);
}

export function commitSettings(nextSettings) {
  state.settings = nextSettings;
  saveSettings(state.settings);
}

export function uid(prefix = "txn") {
  const n = Math.floor(Math.random() * 1e9).toString().padStart(9, "0");
  return `${prefix}_${n}`;
}

export function nowISO() {
  return new Date().toISOString();
}