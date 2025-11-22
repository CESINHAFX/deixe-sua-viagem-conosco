// fragments.js - load HTML fragments into page containers
(function () {
  /*
    Edits made:
    - Add debug logging to trace attempts and script re-execution
    - Preserve API: window.loadFragment, runFragmentScripts, markActiveLink, fetchWithVariants
    - Ensure robust try/catch around script execution and callbacks
  */

  function runFragmentScripts(container) {
    if (!container) return;
    console.debug(
      "[fragments.runFragmentScripts] container:",
      container.id || container.tagName || container,
    );
    const scripts = container.querySelectorAll("script");
    Array.from(scripts).forEach((oldScript, idx) => {
      try {
        const newScript = document.createElement("script");

        // Copy non-src attributes (type, async, defer, etc.) but avoid copying
        // 'src' into text content — we'll set src explicitly when present.
        for (let i = 0; i < oldScript.attributes.length; i++) {
          const attr = oldScript.attributes[i];
          if (attr.name === "src") continue;
          newScript.setAttribute(attr.name, attr.value);
        }

        if (oldScript.src) {
          // External script: set src so browser fetches it (keeps original URL mapping)
          // Resolve relative URLs against current document
          try {
            const resolved = new URL(
              oldScript.getAttribute("src"),
              location.href,
            ).href;
            newScript.src = resolved;
          } catch {
            newScript.src = oldScript.getAttribute("src");
          }
          // Replace old script with new one; append will trigger fetch/execution
          oldScript.parentNode.replaceChild(newScript, oldScript);
          // Optionally wait for load/error for debugging visibility
          newScript.addEventListener("load", () => {
            console.debug(
              "[fragments.runFragmentScripts] loaded",
              newScript.src,
            );
          });
          newScript.addEventListener("error", (ev) => {
            console.warn(
              "[fragments.runFragmentScripts] failed to load",
              newScript.src,
              ev,
            );
          });
        } else {
          // Inline script: add sourceURL so debugger can map it to a sensible name
          const fragmentName =
            container.id || container.dataset.fragment || "fragment";
          const sourceName = `${fragmentName}::inline-${idx}.js`;
          const content = (oldScript.textContent || "").trim();
          newScript.textContent = content + `\n//# sourceURL=${sourceName}`;
          oldScript.parentNode.replaceChild(newScript, oldScript);
          console.debug(
            "[fragments.runFragmentScripts] executed inline",
            sourceName,
          );
        }
      } catch (e) {
        console.error(
          "[fragments.runFragmentScripts] error re-running script:",
          e,
        );
      }
    });
  }

  // Try fetching multiple URL variants to accommodate different dev server roots
  async function fetchWithVariants(url, variantsLimit = 8) {
    console.debug("[fragments.fetchWithVariants] trying variants for", url);
    const tried = new Set();
    const results = [];

    const normalize = (u) => (u || "").replace(/\\/g, "/");
    const basePath = normalize(location.pathname || "");
    const dir = basePath.substring(0, basePath.lastIndexOf("/") + 1) || "./";

    const variants = [
      url,
      "./" + url,
      url.replace(/^\/+/, ""),
      dir + url,
      "/" + url.replace(/^\/+/, ""),
    ];

    // also try climbing up parent dirs using ../ prefixes
    const parts = dir.split("/").filter(Boolean);
    for (let i = 1; i <= Math.min(parts.length + 2, variantsLimit); i++) {
      // create ../, ../../, etc
      const up = Array(i).fill("..").join("/") + "/";
      variants.push(up + url);
    }

    // also try absolute-ish attempts based on root segments
    for (let i = 0; i < Math.min(parts.length, variantsLimit); i++) {
      const p = "/" + parts.slice(0, parts.length - i).join("/") + "/";
      variants.push(p + url);
    }

    for (const u of variants) {
      const candidate = normalize(u);
      if (tried.has(candidate)) continue;
      tried.add(candidate);
      try {
        console.debug("[fragments.fetchWithVariants] attempting", candidate);
        const resp = await fetch(candidate);
        if (resp && resp.ok) {
          console.debug("[fragments.fetchWithVariants] success", candidate);
          return resp;
        }
        results.push({
          url: candidate,
          status: resp ? resp.status : "no-response",
        });
      } catch (e) {
        console.warn(
          "[fragments.fetchWithVariants] attempt failed",
          candidate,
          e && e.message,
        );
        results.push({
          url: candidate,
          error: e && e.message ? e.message : String(e),
        });
      }
    }

    const err = new Error("All fetch attempts failed");
    err.attempts = results;
    console.error(
      "[fragments.fetchWithVariants] all attempts failed:",
      results,
    );
    throw err;
  }

  async function loadFragment(url, containerId, callback) {
    console.debug("[fragments.loadFragment] start", url, containerId);
    try {
      const response =
        typeof window.fetchWithVariants === "function"
          ? await window.fetchWithVariants(url)
          : await fetch(url);

      if (!response.ok)
        throw new Error("Network response was not ok: " + response.status);
      const html = await response.text();
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn(
          "[fragments.loadFragment] container not found:",
          containerId,
        );
        return;
      }
      container.innerHTML = html;
      console.debug(
        "[fragments.loadFragment] fragment injected into",
        containerId,
      );
      try {
        markActiveLink(container);
      } catch (e) {
        console.warn("[fragments.loadFragment] markActiveLink failed", e);
      }
      try {
        runFragmentScripts(container);
      } catch (e) {
        console.warn("[fragments.loadFragment] runFragmentScripts failed", e);
      }
      if (typeof callback === "function") {
        try {
          callback(container);
          console.debug(
            "[fragments.loadFragment] callback executed for",
            containerId,
          );
        } catch (e) {
          console.error("[fragments.loadFragment] callback error:", e);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar fragmento:", err);
    }
  }

  function markActiveLink(container) {
    try {
      const containerEl =
        typeof container === "string"
          ? document.getElementById(container)
          : container;
      if (!containerEl) return;
      const links = containerEl.querySelectorAll("a[href]");
      const current = window.location.pathname.split("/").pop() || "index.html";
      links.forEach((a) => {
        const href = (a.getAttribute("href") || "").split("/").pop();
        if (href === current) a.classList.add("active");
        else a.classList.remove("active");
      });
      console.debug(
        "[fragments.markActiveLink] marked active links for",
        containerEl.id || containerEl.tagName,
      );
    } catch (e) {
      console.error("markActiveLink error:", e);
    }
  }

  window.loadFragment = loadFragment;
  window.runFragmentScripts = runFragmentScripts;
  window.markActiveLink = markActiveLink;
  window.fetchWithVariants = fetchWithVariants;
})();
