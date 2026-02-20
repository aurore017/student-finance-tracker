import { state, commitRecords, commitSettings, uid, nowISO } from "./state.js";
import {
  validateRecordInput,
  validateCapText,
  validateCategoryText,
  validatePositiveNumberText,
  normalizeSpaces
} from "./validators.js";
import { compileRegex, highlight } from "./search.js";

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);

function announcePolite(msg) {
  $("livePolite").textContent = msg;
}

function announceAssertive(msg) {
  $("liveAssertive").textContent = msg;
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.settings.theme || "light");
}

function fmtMoneyRWF(valueRWF) {
  const cur = state.settings.displayCurrency;
  const rates = state.settings.rates;

  if (cur === "RWF") return `${Math.round(valueRWF)} RWF`;
  if (cur === "USD") return `${(valueRWF / (rates.USD || 1)).toFixed(2)} USD`;
  if (cur === "EUR") return `${(valueRWF / (rates.EUR || 1)).toFixed(2)} EUR`;
  return `${Math.round(valueRWF)} RWF`;
}

function parseAmountToRWF(textAmount) {
  // Amounts stored in RWF. User types in RWF.
  return Number(textAmount);
}

function isSameMonth(dateStr, today = new Date()) {
  const d = new Date(dateStr + "T00:00:00");
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
}

/* ---------- sorting/filtering/search ---------- */
function getFilteredSortedRecords() {
  const { sort, categoryFilter, searchText, searchCase } = state.ui;
  const re = compileRegex(searchText, searchCase);

  let list = [...state.records];

  // category filter
  if (categoryFilter && categoryFilter !== "All") {
    list = list.filter((r) => r.category === categoryFilter);
  }

  // regex search (safe)
  if (searchText) {
    if (!re) {
      $("searchHint").textContent = "That search pattern is not valid.";
    } else {
      $("searchHint").textContent = "Showing matches.";
      list = list.filter((r) => {
        const hay = `${r.description} ${r.category} ${r.notes || ""} ${r.date}`;
        return re.test(hay);
      });
    }
  } else {
    $("searchHint").textContent = "Type to search.";
  }

  // sort
  const cmp =
    {
      dateDesc: (a, b) => b.date.localeCompare(a.date),
      dateAsc: (a, b) => a.date.localeCompare(b.date),
      descAsc: (a, b) => a.description.localeCompare(b.description),
      descDesc: (a, b) => b.description.localeCompare(a.description),
      amtAsc: (a, b) => a.amount - b.amount,
      amtDesc: (a, b) => b.amount - a.amount
    }[sort] || ((a, b) => 0);

  list.sort(cmp);
  return { list, reValid: re };
}

/* ---------- render ---------- */
export function renderAll() {
  applyTheme();
  renderFilters();
  renderRecords();
  renderStats();
  renderSettingsUI();
}

export function renderFilters() {
  // category filter select
  const sel = $("categoryFilter");
  const cats = ["All", ...state.settings.categories];
  sel.innerHTML = cats.map((c) => `<option value="${c}">${c}</option>`).join("");
  sel.value = state.ui.categoryFilter || "All";
}

export function renderRecords() {
  const tbody = $("recordsTbody");
  const cards = $("recordsCards");
  const empty = $("emptyState");

  const { list, reValid } = getFilteredSortedRecords();
  const re = state.ui.searchText ? reValid : null;

  const showEmpty = list.length === 0;
  empty.hidden = !showEmpty;

  tbody.innerHTML = "";
  cards.innerHTML = "";

  if (showEmpty) return;

  // Desktop table
  for (const r of list) {
    const tr = document.createElement("tr");
    tr.dataset.id = r.id;

    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${highlight(r.description, re)}</td>
      <td>${highlight(r.category, re)}</td>
      <td class="num">${fmtMoneyRWF(r.amount)}</td>
      <td class="actions">
        <div class="row" style="margin:0">
          <button class="btn btn-ghost" data-act="edit" type="button">Edit</button>
          <button class="btn btn-danger" data-act="del" type="button">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Mobile cards
  for (const r of list) {
    const div = document.createElement("div");
    div.className = "record-card";
    div.dataset.id = r.id;

    div.innerHTML = `
      <h4>${highlight(r.description, re)}</h4>
      <div class="record-meta">
        <span class="pill">${r.date}</span>
        <span class="pill">${highlight(r.category, re)}</span>
        <span class="pill">${fmtMoneyRWF(r.amount)}</span>
      </div>
      <div class="row">
        <button class="btn btn-ghost" data-act="edit" type="button">Edit</button>
        <button class="btn btn-danger" data-act="del" type="button">Delete</button>
      </div>
    `;
    cards.appendChild(div);
  }
}

export function renderStats() {
  const total = state.records.length;
  const sumRWF = state.records.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  $("statTotalRecords").textContent = String(total);
  $("statTotalSpent").textContent = fmtMoneyRWF(sumRWF);
  $("statCurrencyHint").textContent = `Showing ${state.settings.displayCurrency}`;

  // top category
  const counts = {};
  for (const r of state.records) {
    counts[r.category] = (counts[r.category] || 0) + 1;
  }
  let top = "—";
  let topN = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (v > topN) {
      topN = v;
      top = k;
    }
  }
  $("statTopCategory").textContent = top;

  // monthly cap (current month total)
  const today = new Date();
  const monthTotal = state.records
    .filter((r) => isSameMonth(r.date, today))
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  const cap = Number(state.settings.monthlyCapRWF || 0);
  if (!cap) {
    $("statCapStatus").textContent = "Off";
    $("capMessage").textContent = "No cap set.";
  } else {
    const remain = cap - monthTotal;
    if (remain >= 0) {
      $("statCapStatus").textContent = fmtMoneyRWF(remain);
      $("capMessage").textContent = "Remaining this month.";
      announcePolite(`You have ${fmtMoneyRWF(remain)} remaining under your monthly cap.`);
    } else {
      $("statCapStatus").textContent = fmtMoneyRWF(Math.abs(remain));
      $("capMessage").textContent = "Over the cap.";
      announceAssertive(`You are over your monthly cap by ${fmtMoneyRWF(Math.abs(remain))}.`);
    }
  }

  renderTrend();
}

function renderTrend() {
  const chart = $("trendChart");
  const legend = $("trendLegend");
  chart.innerHTML = "";
  legend.innerHTML = "";

  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const totals = days.map((day) =>
    state.records
      .filter((r) => r.date === day)
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
  );

  const max = Math.max(1, ...totals);

  days.forEach((day, idx) => {
    const v = totals[idx];
    const h = Math.round((v / max) * 100);

    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = "bar";
    bar.style.height = `${Math.max(6, h)}%`;
    bar.title = `${day}: ${fmtMoneyRWF(v)}`;
    bar.setAttribute("aria-label", `${day} total ${fmtMoneyRWF(v)}`);
    bar.addEventListener("click", () => announcePolite(`${day}: ${fmtMoneyRWF(v)}`));
    chart.appendChild(bar);
  });

  const left = document.createElement("span");
  left.textContent = days[0].slice(5);

  const mid = document.createElement("span");
  mid.textContent = days[3].slice(5);

  const right = document.createElement("span");
  right.textContent = days[6].slice(5);

  legend.append(left, mid, right);
}

/* ---------- settings UI ---------- */
export function renderSettingsUI() {
  $("darkMode").checked = state.settings.theme === "dark";

  $("baseCurrency").value = state.settings.displayCurrency;
  $("rateUSD").value = String(state.settings.rates.USD ?? "");
  $("rateEUR").value = String(state.settings.rates.EUR ?? "");
  $("monthlyCap").value = state.settings.monthlyCapRWF ? String(state.settings.monthlyCapRWF) : "";

  // category chips
  const ul = $("categoryChips");
  ul.innerHTML = "";
  state.settings.categories.forEach((cat) => {
    const li = document.createElement("li");
    li.className = "chip";
    li.innerHTML = `
      <span>${cat}</span>
      <button type="button" aria-label="Remove ${cat}" data-cat="${cat}">×</button>
    `;
    ul.appendChild(li);
  });
}

/* ---------- handlers ---------- */
export function bindUIHandlers() {
  // Theme toggle (saved immediately)
  $("darkMode").addEventListener("change", (e) => {
    const theme = e.target.checked ? "dark" : "light";
    commitSettings({ ...state.settings, theme });
    applyTheme();
    announcePolite(theme === "dark" ? "Dark mode on." : "Dark mode off.");
  });

  // toolbar
  $("sortSelect").addEventListener("change", (e) => {
    state.ui.sort = e.target.value;
    renderRecords();
  });

  $("categoryFilter").addEventListener("change", (e) => {
    state.ui.categoryFilter = e.target.value;
    renderRecords();
  });

  $("searchInput").addEventListener("input", (e) => {
    state.ui.searchText = e.target.value;
    renderRecords();
  });

  $("searchCase").addEventListener("change", (e) => {
    state.ui.searchCase = e.target.checked;
    renderRecords();
  });

  // form
  $("recordForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleSaveRecord();
  });

  $("resetBtn").addEventListener("click", () => {
    clearForm();
    announcePolite("Form cleared.");
  });

  // table actions (delegate)
  $("recordsTbody").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const tr = e.target.closest("tr");
    if (!tr) return;
    const id = tr.dataset.id;
    if (btn.dataset.act === "edit") startInlineEdit(id, tr);
    if (btn.dataset.act === "del") deleteRecord(id);
  });

  // card actions (delegate)
  $("recordsCards").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const card = e.target.closest("[data-id]");
    if (!card) return;
    const id = card.dataset.id;
    if (btn.dataset.act === "edit") jumpToEdit(id);
    if (btn.dataset.act === "del") deleteRecord(id);
  });

  // settings
  $("settingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveSettingsFromUI();
  });

  $("addCategoryBtn").addEventListener("click", () => addCategory());
  $("categoryChips").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-cat]");
    if (!b) return;
    removeCategory(b.dataset.cat);
  });

  $("exportBtn").addEventListener("click", exportJSON);
  $("importFile").addEventListener("change", (e) => importJSON(e.target.files?.[0]));
  $("resetAllBtn").addEventListener("click", resetAllData);
}

/* ---------- form helpers ---------- */
function setError(id, msg) {
  $(id).textContent = msg || "";
}

function clearFormErrors() {
  setError("errDescription", "");
  setError("errAmount", "");
  setError("errDate", "");
  setError("errCategory", "");
  setError("errNotes", "");
}

function clearForm() {
  $("editId").value = "";
  $("description").value = "";
  $("amount").value = "";
  $("date").value = "";
  $("category").value = "";
  $("notes").value = "";
  clearFormErrors();
  $("saveBtn").textContent = "Save";
}

function handleSaveRecord() {
  clearFormErrors();

  const input = {
    description: $("description").value,
    amount: $("amount").value,
    date: $("date").value,
    category: $("category").value,
    notes: $("notes").value
  };

  input.category = normalizeSpaces(input.category);
  input.notes = normalizeSpaces(input.notes);

  const v = validateRecordInput(input);
  if (!v.ok) {
    setError("errDescription", v.errors.description);
    setError("errAmount", v.errors.amount);
    setError("errDate", v.errors.date);
    setError("errCategory", v.errors.category);
    setError("errNotes", v.errors.notes);
    announcePolite("Please fix the highlighted fields.");
    return;
  }

  const amountRWF = parseAmountToRWF(input.amount);
  const id = $("editId").value || uid("txn");
  const now = nowISO();

  const existing = state.records.find((r) => r.id === id);
  const createdAt = existing ? existing.createdAt : now;

  const record = {
    id,
    description: v.normalized.description,
    amount: amountRWF,
    category: input.category,
    date: input.date,
    notes: input.notes || "",
    createdAt,
    updatedAt: now
  };

  let next;
  if (existing) {
    next = state.records.map((r) => (r.id === id ? record : r));
    announcePolite("Record updated.");
  } else {
    next = [record, ...state.records];
    announcePolite("Record added.");
  }

  commitRecords(next);
  clearForm();
  renderAll();

  // auto-add category if new
  if (!state.settings.categories.includes(record.category)) {
    const nextSettings = {
      ...state.settings,
      categories: [...state.settings.categories, record.category]
    };
    commitSettings(nextSettings);
    renderAll();
  }
}

function jumpToEdit(id) {
  const r = state.records.find((x) => x.id === id);
  if (!r) return;

  $("editId").value = r.id;
  $("description").value = r.description;
  $("amount").value = String(r.amount);
  $("date").value = r.date;
  $("category").value = r.category;
  $("notes").value = r.notes || "";
  $("saveBtn").textContent = "Update";

  clearFormErrors();
  location.hash = "#add";
  $("description").focus();
  announcePolite("Editing record.");
}

/* ---------- inline edit (table) ---------- */
function startInlineEdit(id, tr) {
  const r = state.records.find((x) => x.id === id);
  if (!r) return;

  const safeDesc = r.description.replaceAll('"', "&quot;");
  const safeCat = r.category.replaceAll('"', "&quot;");

  tr.innerHTML = `
    <td><input aria-label="Edit date" value="${r.date}" data-f="date" /></td>
    <td><input aria-label="Edit description" value="${safeDesc}" data-f="description" /></td>
    <td><input aria-label="Edit category" value="${safeCat}" data-f="category" /></td>
    <td class="num"><input aria-label="Edit amount" value="${r.amount}" data-f="amount" style="text-align:right" /></td>
    <td class="actions">
      <div class="row" style="margin:0">
        <button class="btn btn-primary" data-act="saveRow" type="button">Save</button>
        <button class="btn btn-ghost" data-act="cancelRow" type="button">Cancel</button>
      </div>
      <div class="error" role="status" aria-live="polite" style="min-height:16px;margin-top:6px" data-err></div>
    </td>
  `;

  const first = tr.querySelector('input[data-f="date"]');
  if (first) first.focus();

  tr.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;

      if (btn.dataset.act === "cancelRow") {
        renderRecords();
        announcePolite("Edit cancelled.");
        return;
      }

      if (btn.dataset.act === "saveRow") {
        const nextInput = {
          date: tr.querySelector('input[data-f="date"]').value,
          description: tr.querySelector('input[data-f="description"]').value,
          category: tr.querySelector('input[data-f="category"]').value,
          amount: tr.querySelector('input[data-f="amount"]').value,
          notes: r.notes || ""
        };

        nextInput.category = normalizeSpaces(nextInput.category);

        const v = validateRecordInput(nextInput);
        const errBox = tr.querySelector("[data-err]");

        if (!v.ok) {
          errBox.textContent =
            v.errors.description ||
            v.errors.amount ||
            v.errors.date ||
            v.errors.category ||
            "Fix the fields.";
          announcePolite("Please fix the row fields.");
          return;
        }

        const updated = {
          ...r,
          date: nextInput.date,
          description: v.normalized.description,
          category: nextInput.category,
          amount: Number(nextInput.amount),
          updatedAt: nowISO()
        };

        commitRecords(state.records.map((x) => (x.id === id ? updated : x)));

        // auto-add category if new
        if (!state.settings.categories.includes(updated.category)) {
          commitSettings({
            ...state.settings,
            categories: [...state.settings.categories, updated.category]
          });
        }

        renderAll();
        announcePolite("Row saved.");
      }
    },
    { once: true }
  );
}

/* ---------- delete ---------- */
function deleteRecord(id) {
  const r = state.records.find((x) => x.id === id);
  if (!r) return;

  const ok = confirm(`Delete "${r.description}"?`);
  if (!ok) return;

  commitRecords(state.records.filter((x) => x.id !== id));
  renderAll();
  announcePolite("Record deleted.");
}

/* ---------- settings save ---------- */
function saveSettingsFromUI() {
  setError("errRateUSD", "");
  setError("errRateEUR", "");
  setError("errMonthlyCap", "");

  const displayCurrency = $("baseCurrency").value;
  const rateUSD = $("rateUSD").value.trim();
  const rateEUR = $("rateEUR").value.trim();
  const cap = $("monthlyCap").value.trim();

  const vUSD = validatePositiveNumberText(rateUSD);
  const vEUR = validatePositiveNumberText(rateEUR);
  const vCap = validateCapText(cap);

  if (!vUSD.ok) setError("errRateUSD", vUSD.msg);
  if (!vEUR.ok) setError("errRateEUR", vEUR.msg);
  if (!vCap.ok) setError("errMonthlyCap", vCap.msg);

  if (!vUSD.ok || !vEUR.ok || !vCap.ok) {
    announcePolite("Please fix settings fields.");
    return;
  }

  const next = {
    ...state.settings,
    displayCurrency,
    rates: { USD: Number(rateUSD), EUR: Number(rateEUR) },
    monthlyCapRWF: cap === "" ? 0 : Number(cap)
  };

  commitSettings(next);
  renderAll();
  announcePolite("Settings saved.");
}

/* ---------- categories ---------- */
function addCategory() {
  setError("errNewCategory", "");
  const raw = $("newCategory").value;
  const name = normalizeSpaces(raw);

  const v = validateCategoryText(name);
  if (!v.ok) {
    setError("errNewCategory", v.msg);
    return;
  }

  if (state.settings.categories.includes(name)) {
    setError("errNewCategory", "That category already exists.");
    return;
  }

  const next = { ...state.settings, categories: [...state.settings.categories, name] };
  commitSettings(next);

  $("newCategory").value = "";
  renderAll();
  announcePolite("Category added.");
}

function removeCategory(cat) {
  // don’t remove if used by any record
  if (state.records.some((r) => r.category === cat)) {
    announcePolite("You can’t remove a category that is in use.");
    return;
  }

  const nextCats = state.settings.categories.filter((c) => c !== cat);
  commitSettings({ ...state.settings, categories: nextCats });

  if (state.ui.categoryFilter === cat) state.ui.categoryFilter = "All";

  renderAll();
  announcePolite("Category removed.");
}

/* ---------- import/export ---------- */
function download(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function validateImportedRecords(arr) {
  if (!Array.isArray(arr)) return { ok: false, msg: "File must be a JSON array." };

  for (const r of arr) {
    if (!r || typeof r !== "object") return { ok: false, msg: "Invalid record shape." };

    const required = ["id", "description", "amount", "category", "date", "createdAt", "updatedAt"];
    for (const k of required) {
      if (!(k in r)) return { ok: false, msg: `Missing field: ${k}` };
    }

    if (typeof r.id !== "string" || !r.id) return { ok: false, msg: "Bad id." };
    if (typeof r.description !== "string") return { ok: false, msg: "Bad description." };
    if (typeof r.category !== "string") return { ok: false, msg: "Bad category." };
    if (typeof r.date !== "string") return { ok: false, msg: "Bad date." };
    if (typeof r.createdAt !== "string" || typeof r.updatedAt !== "string")
      return { ok: false, msg: "Bad timestamps." };
    if (typeof r.amount !== "number" || Number.isNaN(r.amount)) return { ok: false, msg: "Bad amount." };
  }

  return { ok: true, msg: "" };
}

function exportJSON() {
  const data = JSON.stringify(state.records, null, 2);
  download("glowbudget-export.json", data);
  announcePolite("Exported JSON.");
}

async function importJSON(file) {
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const v = validateImportedRecords(data);
    if (!v.ok) {
      $("importExportHint").textContent = `Import failed: ${v.msg}`;
      announcePolite("Import failed.");
      return;
    }

    // Replace all records (simple + clear)
    commitRecords(data);

    // merge categories from import
    const importedCats = Array.from(new Set(data.map((r) => r.category))).sort();
    const nextCats = Array.from(new Set([...state.settings.categories, ...importedCats]));
    commitSettings({ ...state.settings, categories: nextCats });

    $("importExportHint").textContent = "Import complete.";
    renderAll();
    announcePolite("Import complete.");
  } catch {
    $("importExportHint").textContent = "Import failed: file is not valid JSON.";
    announcePolite("Import failed.");
  } finally {
    $("importFile").value = "";
  }
}

/* ---------- reset ---------- */
function resetAllData() {
  const ok = confirm("Reset everything? This clears records and settings.");
  if (!ok) return;

  localStorage.removeItem("glowbudget:data:v1");
  localStorage.removeItem("glowbudget:settings:v1");
  location.reload();
}