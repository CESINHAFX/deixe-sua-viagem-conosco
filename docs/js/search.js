// js/search.js
import Fuse from "https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.js";
import {
  normalizeText,
  debounce,
  getAllItems,
  ensureResultsContainer,
} from "./utils.js";

export const searchOptions = {
  includeScore: true,
  keys: ["name", "description", "categories"],
  threshold: 0.4,
};

export let resultsContainer = null;
export let debounceTimer = null;
export let headerInitialized = false;
export const button = document.getElementById("more-informations");

export function setupHeaderButtons() {
  try {
    if (headerInitialized) {
      console.debug("[setupHeaderButtons] already initialized, skipping");
      return;
    }
    const searchInput =
      document.querySelector("#Research") ||
      document.querySelector('.nav-right input[type="text"]') ||
      document.getElementById("more-informations");
    if (!searchInput) {
      console.debug("[setupHeaderButtons] search input not found");
      return;
    }

    resultsContainer = ensureResultsContainer();

    const handler = (e) => {
      const term = e.target.value.trim();
      console.debug("[setupHeaderButtons] input event, term:", term);
      if (term.length >= 3 && typeof searchDestinations === "function") {
        searchDestinations(term);
      } else if (resultsContainer) {
        resultsContainer.innerHTML = "";
      }
    };

    // usa debounce importado para limpar lógica de timeout
    searchInput.addEventListener("input", debounce(handler, 300));

    headerInitialized = true;
    console.log("[DEBUG] setupHeaderButtons completed");
  } catch (err) {
    console.error("setupHeaderButtons error:", err);
    console.debug("setupHeaderButtons debug:", {
      headerInitialized,
      hasResultsContainer: !!resultsContainer,
    });
  }
}

// compatibilidade global opcional
if (typeof window !== "undefined") {
  window.setupHeaderButtons = setupHeaderButtons;
}

/**
 * Carrega/inicializa o header compartilhado. Retorna uma Promise que resolve com o elemento input de busca (ou null)
 */
export async function carregarHeaderEInicializar() {
  console.debug("[carregarHeaderEInicializar] start");
  try {
    // If fragments loader from fragments.js is available, use it (it handles many path variants)
    if (typeof window.loadFragment === "function") {
      console.debug(
        "[carregarHeaderEInicializar] using window.loadFragment API",
      );
      return new Promise((resolve) => {
        try {
          window.loadFragment(
            "fragments/header.html",
            "shared-header",
            (container) => {
              console.debug(
                "[carregarHeaderEInicializar] loadFragment callback",
              );
              // find input inside injected header
              const headerEl =
                document.getElementById("shared-header") || container;
              const searchInput = headerEl
                ? headerEl.querySelector("#Research")
                : document.querySelector("#Research");
              if (searchInput) {
                // lightweight listener to keep behavior even if setupHeaderButtons not yet called
                searchInput.addEventListener("input", (e) => {
                  const term = e.target.value.trim();
                  if (
                    term.length >= 3 &&
                    typeof searchDestinations === "function"
                  )
                    searchDestinations(term);
                });
              }
              resolve(searchInput || null);
            },
          );
        } catch (e) {
          console.error("[carregarHeaderEInicializar] loadFragment threw", e);
          resolve(null);
        }
      });
    }

    // fallback: try to fetch the header directly
    console.debug("[carregarHeaderEInicializar] fallback fetch header");
    const response = await (typeof window.fetchWithVariants === "function"
      ? window.fetchWithVariants("fragments/header.html")
      : fetch("fragments/header.html"));
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();

    // inject into an existing header element or into #shared-header
    let headerElement =
      document.querySelector("header") ||
      document.getElementById("shared-header");
    if (!headerElement) {
      // create a placeholder if no header element exists
      headerElement = document.createElement("header");
      headerElement.id = "shared-header";
      document.body.insertBefore(headerElement, document.body.firstChild);
    }
    headerElement.innerHTML = html;

    // find search input inside injected header
    const searchInput =
      headerElement.querySelector("#Research") ||
      document.querySelector("#Research");
    if (!searchInput) {
      console.warn(
        "[carregarHeaderEInicializar] input de busca não encontrado dentro do header injetado",
      );
      return null;
    }

    // lightweight listener (a lógica principal de debounce/busca está em setupHeaderButtons)
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.trim();
      if (term.length >= 3 && typeof searchDestinations === "function")
        searchDestinations(term);
    });

    console.debug(
      "[carregarHeaderEInicializar] header injected and search input wired",
    );
    return searchInput;
  } catch (error) {
    console.error("Erro ao carregar header ou inicializar busca:", error);
    console.debug("carregarHeaderEInicializar debug:", {
      headerInitialized,
      stack: error?.stack,
    });
    return null;
  }
}

export function getAllItemsFromDatabase(database) {
  return getAllItems(database);
}

export function calculateScore(item, fuseScore) {
  try {
    console.debug("[calculateScore] item, fuseScore:", item?.name, fuseScore);
    const baseScore = 1 - (fuseScore ?? 1);
    const weights = {
      culture: 0.3,
      nature: 0.25,
      adventure: 0.2,
      relaxation: 0.15,
      gastronomy: 0.1,
    };
    let weighted = baseScore;
    if (Array.isArray(item?.categories)) {
      item.categories.forEach((cat) => {
        if (weights[cat]) weighted += weights[cat];
      });
    }
    return weighted;
  } catch (err) {
    console.error("Erro ao calcular score:", err);
    return 0;
  }
}

export async function searchDestinations(searchTerm) {
  console.debug("[searchDestinations] start for", searchTerm);
  resultsContainer = resultsContainer || ensureResultsContainer();
  if (!resultsContainer) {
    console.warn("[searchDestinations] no results container");
    return;
  }

  resultsContainer.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Buscando os melhores destinos...</p>
    </div>`;
  console.log("[searchDestinations] loading state shown");
  try {
    console.debug("[searchDestinations] fetching database.json");
    const response = await fetch("./database.json");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    console.debug(
      "[searchDestinations] database loaded, items:",
      Object.keys(data || {}).length,
    );

    const fuse = new Fuse(getAllItems(data), searchOptions);
    const results = fuse.search(normalizeText(searchTerm));
    console.debug(
      "[searchDestinations] fuse returned",
      results.length,
      "results",
    );

    const recommendations = results
      .map((r) => ({ ...r.item, score: calculateScore(r.item, r.score) }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    resultsContainer.innerHTML = "";
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      resultsContainer.innerHTML =
        '<p class="empty">Nenhum destino encontrado</p>';
      return;
    }

    const topTwo = recommendations.slice(0, 2);
    const cardsHtml = topTwo
      .map(
        (city) => `
      <div class="recommendation-card">
        <img src="${city.imageUrl || "images/placeholder.svg"}" alt="${city.name}" onerror="this.src='images/placeholder.svg'">
        <div class="recommendation-card-content">
          <h3>${city.name}</h3>
          <p class="score">Match: ${Math.round((city.score || 0) * 100)}%</p>
          <p>${city.description || "Sem descrição disponível"}</p>
        </div>
      </div>`,
      )
      .join("");

    // Se existir o container estático na página de recomendações, substituir seu conteúdo
    const staticContainer = document.getElementById(
      "cities-recommendation-list-static",
    );
    if (staticContainer) {
      staticContainer.innerHTML = cardsHtml;
      console.debug(
        "[searchDestinations] replaced static recommendation container",
      );
      return;
    }

    const citiesSection = document.createElement("div");
    citiesSection.className = "cities-recommendation";
    citiesSection.innerHTML = cardsHtml;

    resultsContainer.appendChild(citiesSection);
    console.debug("[searchDestinations] rendered recommendations");
  } catch (err) {
    console.error("Erro na busca:", err);
    resultsContainer.innerHTML = `
      <div class="error-state">
        <p>Erro ao buscar destinos. Tente novamente.</p>
      </div>`;
  }
}
