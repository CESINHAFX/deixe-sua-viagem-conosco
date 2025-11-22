// js/utils.js
export function normalizeText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

export function getAllItems(database) {
  const items = [];
  ["countries", "temples", "beaches"].forEach((category) => {
    if (database[category]) items.push(...database[category]);
  });
  return items;
}

export function ensureResultsContainer() {
  let el = document.getElementById("results");
  if (!el) {
    el = document.createElement("div");
    el.id = "results";
    el.className = "search-results";
    document.querySelector("main")?.appendChild(el);
  }
  return el;
}
