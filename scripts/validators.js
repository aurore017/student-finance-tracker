// Regex rules (min 4 + one advanced)
export const RX = {
  // forbid leading/trailing spaces (and later we collapse doubles in normalize)
  descNoEdgeSpaces: /^\S(?:.*\S)?$/,
  // numeric: integers or 1-2 decimals
  amount: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  // date YYYY-MM-DD strict months/days
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  // category letters/spaces/hyphens
  category: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  // advanced: duplicate word (back-reference)
  dupWord: /\b(\w+)\s+\1\b/i
};

export function normalizeSpaces(s) {
  return (s || "").replace(/\s{2,}/g, " ").trim();
}

export function validateRecordInput({ description, amount, date, category, notes }) {
  const errors = {};

  const dNorm = normalizeSpaces(description);
  if (!RX.descNoEdgeSpaces.test(description || "")) {
    errors.description = "No leading or trailing spaces.";
  } else if (dNorm.length < 2) {
    errors.description = "Too short.";
  }

  if (!RX.amount.test(amount || "")) {
    errors.amount = "Use numbers like 6500 or 12.50";
  }

  if (!RX.date.test(date || "")) {
    errors.date = "Use YYYY-MM-DD";
  }

  if (!RX.category.test(category || "")) {
    errors.category = "Letters only (spaces or hyphens allowed).";
  }

  if (notes && RX.dupWord.test(notes)) {
    errors.notes = "Notes has a repeated word (example: coffee coffee).";
  }

  return { ok: Object.keys(errors).length === 0, errors, normalized: { description: dNorm } };
}

export function validatePositiveNumberText(v) {
  // reuse numeric rule, but also must be > 0
  if (!RX.amount.test(v || "")) return { ok: false, msg: "Use numbers like 1300 or 12.50" };
  const n = Number(v);
  if (!(n > 0)) return { ok: false, msg: "Must be greater than 0." };
  return { ok: true, msg: "" };
}

export function validateCapText(v) {
  if (v === "" || v == null) return { ok: true, msg: "" };
  if (!RX.amount.test(v)) return { ok: false, msg: "Use numbers like 50000 or 12.50" };
  const n = Number(v);
  if (n < 0) return { ok: false, msg: "Must be 0 or more." };
  return { ok: true, msg: "" };
}

export function validateCategoryText(v) {
  if (!RX.category.test(v || "")) return { ok: false, msg: "Letters only (spaces or hyphens allowed)." };
  return { ok: true, msg: "" };
}