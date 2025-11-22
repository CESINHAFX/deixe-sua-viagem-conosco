/**
 * @fileoverview Gerencia transições suaves entre páginas com animações e histórico de navegação.
 * Implementa um sistema de navegação SPA-like com transições animadas.
 * @author CESINHAFX
 * @version 1.0.0
 */

/**
 * Classe responsável por gerenciar transições entre páginas
 * @class
 */
class PageTransitionManager {
  /**
   * Inicializa o gerenciador de transições
   * @constructor
   */
  constructor() {
    this.bindEvents();
    this.setupPopState();
  }

  /**
   * Vincula os eventos de clique para interceptar navegação
   * @private
   */
  bindEvents() {
    document.addEventListener("click", (e) => this.handleClick(e));
  }

  /**
   * Configura o tratamento do histórico de navegação
   * @private
   */
  setupPopState() {
    window.addEventListener("popstate", () => {
      this.loadPage(window.location.pathname, false);
    });
  }

  /**
   * Trata eventos de clique em links
   * @async
   * @param {Event} e - Evento do clique
   * @private
   */
  async handleClick(e) {
    const link = e.target.closest("a");
    if (!this.shouldHandleLink(link)) return;

    e.preventDefault();
    const targetUrl = link.getAttribute("href");
    await this.loadPage(targetUrl, true);
  }

  /**
   * Verifica se um link deve ser tratado pelo gerenciador
   * @param {HTMLAnchorElement} link - Elemento de link
   * @returns {boolean} True se o link deve ser tratado
   * @private
   */
  shouldHandleLink(link) {
    if (!link) return false;
    const href = link.getAttribute("href");
    return (
      href &&
      !href.startsWith("http") &&
      !href.startsWith("#") &&
      !link.hasAttribute("target")
    );
  }

  /**
   * Carrega uma nova página com animação de transição
   * @async
   * @param {string} url - URL da página a ser carregada
   * @param {boolean} [addToHistory=true] - Se deve adicionar ao histórico do navegador
   * @private
   */
  async loadPage(url, addToHistory = true) {
    // Busca o elemento principal da página e a barra de navegação direita
    const main = document.querySelector("main");
    const navRight = document.querySelector(".nav-right");
    // Se não encontrar o elemento principal, aborta a transição
    if (!main) return;

    // Inicia a animação de saída da página atual
    main.classList.add("page-exit");
    // Gerencia a visibilidade e animação da barra de navegação direita
    if (navRight) {
      // Verifica se estamos indo para a página inicial
      const isHomePage = url.endsWith("index.html");
      // Mostra/esconde a barra de navegação baseado na página
      navRight.style.display = isHomePage ? "flex" : "none";
      // Se for a página inicial, adiciona animação de saída
      if (isHomePage) {
        navRight.classList.add("page-exit");
      }
    }

    await this.wait(300);

    try {
      // Faz uma requisição HTTP para buscar o conteúdo da nova página
      const response = await fetch(url);
      // Verifica se a requisição foi bem-sucedida
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      // Converte a resposta em texto HTML
      const html = await response.text();

      // Cria um parser para analisar o HTML da nova página
      const parser = new DOMParser();
      // Converte o texto HTML em um documento DOM
      const doc = parser.parseFromString(html, "text/html");
      // Busca o elemento principal da nova página
      const newMain = doc.querySelector("main");

      if (newMain) {
        // Atualizar conteúdo e disparar animação de entrada
        main.innerHTML = newMain.innerHTML;
        main.classList.remove("page-exit");
        main.classList.add("page-enter");

        if (navRight && url.endsWith("index.html")) {
          navRight.classList.remove("page-exit");
          navRight.classList.add("page-enter");
          setTimeout(() => navRight.classList.remove("page-enter"), 600);
        }

        // Atualizar histórico se necessário
        if (addToHistory) {
          history.pushState({ path: url }, "", url);
        }

        // Limpar classe após animação
        setTimeout(() => main.classList.remove("page-enter"), 600);
      }
    } catch (error) {
      console.error("Erro ao carregar página:", error);
      // Fallback: navegação normal em caso de erro
      window.location.href = url;
    }
  }

  /**
   * Utilitário para criar uma promessa que resolve após um tempo específico
   * @param {number} ms - Tempo em milissegundos para esperar
   * @returns {Promise} Promessa que resolve após o tempo especificado
   * @private
   */
  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Inicializa o gerenciador de transições quando o DOM estiver pronto
 * @listens DOMContentLoaded
 */
document.addEventListener("DOMContentLoaded", () => {
  new PageTransitionManager();
});
