import { records, remove } from "./state.js";

export function renderTable() {
  const body = document.getElementById("table-body");

  body.innerHTML = records.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.description}</td>
      <td>${r.amount}</td>
      <td>${r.category}</td>
      <td><button data-id="${r.id}">X</button></td>
    </tr>
  `).join("");

  body.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      remove(btn.dataset.id);
      renderTable();
      renderStats();
    };
  });
}

export function renderStats() {
  document.getElementById("stat-count").textContent = records.length;

  const sum = records.reduce((s, r) => s + Number(r.amount), 0);
  document.getElementById("stat-sum").textContent = sum.toFixed(2);

  const cats = {};
  records.forEach(r => cats[r.category] = (cats[r.category] || 0) + 1);

  const top = Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById("stat-top").textContent = top ? top[0] : "—";
}
