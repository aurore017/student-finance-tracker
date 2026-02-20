import { load, save } from "./storage.js";

export let records = load();

export function add(record) {
  records.push(record);
  save(records);
}

export function remove(id) {
  records = records.filter(r => r.id !== id);
  save(records);
}
