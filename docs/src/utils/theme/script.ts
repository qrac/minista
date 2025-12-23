type Attrs = {
  button: string
  targetAttr: string
}

type Config = {
  root?: HTMLElement
  attrs?: Partial<Attrs>
}

type ResolvedConfig = {
  root: HTMLElement
  attrs: Attrs
}

export const jsTheme = (() => {
  const listenerMap = new WeakMap<HTMLElement, Record<string, EventListener>>()

  const defaultConfig: ResolvedConfig = {
    root: document.documentElement,
    attrs: {
      button: "data-theme-button",
      targetAttr: "data-theme",
    },
  }

  const lightModeQuery = window.matchMedia("(prefers-color-scheme: light)")

  function bindOnce(
    el: HTMLElement | MediaQueryList,
    key: string,
    type: string,
    handler: EventListener
  ) {
    if (el instanceof MediaQueryList) {
      el.addEventListener(type, handler as any)
      return
    }

    const map = listenerMap.get(el) ?? {}
    if (map[key]) return
    el.addEventListener(type, handler as any)
    map[key] = handler
    listenerMap.set(el, map)
  }

  function updateTheme(config: ResolvedConfig, theme: string) {
    const { root, attrs } = config
    let targetTheme = theme

    if (theme === "system") {
      targetTheme = lightModeQuery.matches ? "light" : "dark"
    }

    root.setAttribute(attrs.targetAttr, targetTheme)
  }

  function updateButtons(config: ResolvedConfig, activeTheme: string) {
    const { root, attrs } = config
    const buttons = Array.from(
      root.querySelectorAll(`[${attrs.button}]`)
    ) as HTMLElement[]

    buttons.forEach((btn) => {
      if (btn.getAttribute(attrs.button) === activeTheme) {
        btn.classList.add("is-active")
      } else {
        btn.classList.remove("is-active")
      }
    })
  }

  function init(config?: Config) {
    const resolvedConfig = {
      ...defaultConfig,
      ...config,
      attrs: { ...defaultConfig.attrs, ...config?.attrs },
    } as ResolvedConfig
    const { root, attrs } = resolvedConfig

    const savedTheme = localStorage.getItem("theme") || "system"

    updateTheme(resolvedConfig, savedTheme)
    updateButtons(resolvedConfig, savedTheme)

    const buttons = Array.from(
      root.querySelectorAll(`[${attrs.button}]`)
    ) as HTMLElement[]

    buttons.forEach((btn) => {
      bindOnce(btn, "themeClick", "click", () => {
        const theme = btn.getAttribute(attrs.button)
        if (theme) {
          localStorage.setItem("theme", theme)
          updateTheme(resolvedConfig, theme)
          updateButtons(resolvedConfig, theme)
        }
        btn.blur()
      })
    })

    bindOnce(lightModeQuery, "themeChange", "change", () => {
      const currentTheme = localStorage.getItem("theme") || "system"
      if (currentTheme === "system") {
        updateTheme(resolvedConfig, "system")
      }
    })
  }

  return { init }
})()
