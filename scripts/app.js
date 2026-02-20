import { add } from "./state.js";
import { renderTable, renderStats } from "./ui.js";
import { validate } from "./validators.js";

const form = document.getElementById("form");
const error = document.getElementById("form-error");
const description = document.getElementById("description");
const amount = document.getElementById("amount");
const category = document.getElementById("category");
const date = document.getElementById("date");

document.querySelectorAll("nav button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(btn.dataset.view).classList.remove("hidden");
  };
});

form.onsubmit = e => {
  e.preventDefault();

  const data = {
    id: "rec_" + Date.now(),
    description: description.value.trim(),
    amount: amount.value,
    category: category.value.trim(),
    date: date.value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const err = validate(data);
  if (err) return error.textContent = err;

  add({ ...data, amount: Number(data.amount) });

  form.reset();
  error.textContent = "";
  renderTable();
  renderStats();
};

/* EXPORT JSON */
document.getElementById("export").onclick = () => {
  const blob = new Blob(
    [localStorage.getItem("finance:data")],
    { type: "application/json" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "finance-data.json";
  a.click();
};

/* IMPORT JSON */
document.getElementById("import").onchange = e => {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = () => {
    localStorage.setItem("finance:data", reader.result);
    location.reload();
  };

  reader.readAsText(file);
};

renderTable();
renderStats();
