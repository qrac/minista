export function jsHeaderThemeMenuClose() {
  const buttonEls = document.querySelectorAll("[data-header-theme-menu-close]")

  buttonEls.forEach((el) => {
    el.addEventListener("click", () => {
      const target = el.closest(
        "[data-header-theme-menu]"
      ) as HTMLDetailsElement

      if (target && target.open) {
        target.open = false
      }
    })
  })
}

export function jsHeaderMobileMenuToggle() {
  let isActive = false
  let scrollPosition = 0

  const bodyEl = document.body
  const buttonEl = document.querySelector("[data-header-mobile-menu-toggle]")

  if (!buttonEl) {
    return
  }

  const toggleMenu = () => {
    buttonEl.classList.toggle("is-active")
    isActive = buttonEl.classList.contains("is-active")

    if (isActive) {
      scrollPosition = window.scrollY
      bodyEl.style.overflow = "hidden"
    } else {
      bodyEl.style.removeProperty("overflow")
      window.scrollTo(0, scrollPosition)
    }
  }

  const closeMenu = () => {
    if (isActive) {
      buttonEl.classList.remove("is-active")
      isActive = false
      bodyEl.style.removeProperty("overflow")
      window.scrollTo(0, scrollPosition)
    }
  }

  const resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      const width = entry.contentRect.width
      if (width >= 992 && isActive) {
        closeMenu()
      }
    }
  })

  buttonEl.addEventListener("click", toggleMenu)
  resizeObserver.observe(document.documentElement)
}
