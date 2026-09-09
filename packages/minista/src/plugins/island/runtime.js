// @ts-check

// DOM state belongs to this browser runtime, never to a server or build session.
const scheduled = new WeakSet()

/**
 * @param {Record<number, () => Promise<{ default: any }>>} loaders
 * @param {string} rootAttrName
 * @param {() => Promise<{ renderIsland: (el: Element, component: any, only: boolean) => void }>} loadRenderer
 */
export function runIslands(loaders, rootAttrName, loadRenderer) {
  const prefix = rootAttrName ? `${rootAttrName}-` : ""
  const attr = `data-${prefix}client-`
  /** @type {Map<number, Promise<{ default: any }>>} */
  const modules = new Map()
  /** @type {ReturnType<typeof loadRenderer> | undefined} */
  let renderer
  document.querySelectorAll(`[${attr}snippet]`).forEach((el) => {
    const id = Number(el.getAttribute(`${attr}snippet`))
    const load = loaders[id]
    if (!load || scheduled.has(el)) return
    scheduled.add(el)
    const directive = el.getAttribute(`${attr}directive`) || "load"
    let started = false
    const start = async () => {
      if (started) return
      started = true
      try {
        let module = modules.get(id)
        if (!module) {
          module = load()
          modules.set(id, module)
        }
        renderer ??= loadRenderer()
        const [component, runtime] = await Promise.all([module, renderer])
        if (!el.isConnected) return
        // Preserve the existing normalization, but only when hydration actually starts.
        el.innerHTML = el.innerHTML.replace(/\>[\r\n ]+/g, ">")
        runtime.renderIsland(el, component.default, directive === "only")
      } catch (cause) {
        console.error({
          code: "MINISTA_ISLAND_LOAD_FAILED",
          severity: "error",
          message: "Island module loading or hydration failed.",
          snippet: id,
          directive,
          cause,
        })
      }
    }
    try {
      const raw = el.getAttribute(`${attr}directive-params`)
      const params = directive === "media" ? {} : JSON.parse(raw || "{}")
      switch (directive) {
        case "load":
        case "only":
          void start()
          break
        case "idle":
          if ("requestIdleCallback" in window) {
            window.requestIdleCallback(() => void start(), params.timeout ? { timeout: params.timeout } : {})
          } else {
            setTimeout(() => void start(), params.timeout || 0)
          }
          break
        case "visible": {
          const target = el.firstElementChild
          if (!target) break
          const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              observer.disconnect()
              void start()
            }
          }, { root: params.root || null, rootMargin: params.rootMargin || "0px", threshold: params.threshold || 0 })
          observer.observe(target)
          break
        }
        case "media": {
          const media = window.matchMedia(raw || "")
          const onChange = () => {
            if (!media.matches) return
            media.removeEventListener("change", onChange)
            void start()
          }
          media.addEventListener("change", onChange)
          onChange()
          break
        }
        default:
          console.warn({ code: "MINISTA_ISLAND_DIRECTIVE_UNKNOWN", severity: "warning", message: "Unknown Island directive.", snippet: id, directive })
      }
    } catch (cause) {
      console.error({ code: "MINISTA_ISLAND_DIRECTIVE_FAILED", severity: "error", message: "Island directive setup failed.", snippet: id, directive, cause })
    }
  })
}
