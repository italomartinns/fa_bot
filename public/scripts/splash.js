(() => {
  const storageKey = "fa_welcome_splash";
  const duration = 1800;
  let startedAt = Date.now();

  // Keep it continuous through authentication redirects.
  try {
    const saved = sessionStorage.getItem(storageKey);
    if (saved === "complete") return;
    const previousStart = Number(saved);
    if (previousStart > 0) startedAt = previousStart;
    sessionStorage.setItem(storageKey, String(startedAt));
  } catch {
    // it still works when browser storage is unavailable.
  }

  const remaining = Math.max(0, duration - (Date.now() - startedAt));
  if (!remaining) return;

  const splash = document.createElement("div");
  splash.className = "welcome-splash";
  splash.setAttribute("role", "status");
  splash.setAttribute("aria-label", "Forcare Alzheimer");
  splash.innerHTML = `
    <div class="welcome-splash-content" aria-hidden="true">
      <img class="welcome-splash-logo" src="/icon.svg" alt="" width="144" height="144" />
      <p class="welcome-splash-title">Forcare Alzheimer</p>
      <span class="welcome-splash-accent"></span>
    </div>
  `;

  document.documentElement.classList.add("welcome-active");
  document.body.prepend(splash);

  window.setTimeout(() => {
    try {
      sessionStorage.setItem(storageKey, "complete");
    } catch {
      // Storage is optional; always release the page.
    }
    document.documentElement.classList.remove("welcome-active");
    splash.remove();
  }, remaining);
})();