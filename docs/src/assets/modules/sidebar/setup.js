(() => {
  const sidebar = document.querySelector("[data-sidebar-scroll]")
  if (!(sidebar instanceof HTMLElement)) return

  const desktop = window.matchMedia("(min-width: 744px)")
  const storageKey = `minista:docs:sidebar-scroll:${document.documentElement.lang}`

  function restore() {
    if (!desktop.matches) return

    try {
      const saved = sessionStorage.getItem(storageKey)
      if (saved === null) return

      const scrollTop = Number(saved)
      if (Number.isFinite(scrollTop) && scrollTop >= 0) {
        sidebar.scrollTop = scrollTop
      }
    } catch {
      // Storage may be unavailable under browser privacy settings.
    }
  }

  function save() {
    if (!desktop.matches) return

    try {
      sessionStorage.setItem(storageKey, String(sidebar.scrollTop))
    } catch {
      // Navigation should still work when storage is unavailable.
    }
  }

  // Run next to the sidebar markup, before the deferred module initializes.
  // BFCache restores this DOM without rerunning the script, preserving its position.
  restore()
  sidebar.addEventListener("scroll", save, { passive: true })
  window.addEventListener("pagehide", save)
  desktop.addEventListener("change", restore)
})()
