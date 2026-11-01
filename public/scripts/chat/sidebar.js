function isMobileLayout() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function setSidebarOpen(isOpen) {
  document.body.classList.toggle("sidebar-open", isOpen);
  if (menuBtn) {
    menuBtn.setAttribute("aria-expanded", String(isOpen));
  }
}

function closeSidebarOnMobile() {
  if (isMobileLayout()) {
    setSidebarOpen(false);
  }
}