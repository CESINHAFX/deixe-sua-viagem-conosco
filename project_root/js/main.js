// js/main.js
import { carregarHeaderEInicializar, setupHeaderButtons } from "./search.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // primeiro: carrega/injeta o header (se existir fragment)
    await carregarHeaderEInicializar();
    // depois: configura bot�es/handlers com base no header injetado
    setupHeaderButtons();
  } catch (err) {
    console.error("Erro na inicializa��o (main.js):", err);
  }
});
