type SidetocAttrs = {
  container: string
  targetArea: string
  sourceToc: string
}

type SidetocConfig = {
  root?: HTMLElement
  attrs?: Partial<SidetocAttrs>
}

type ResolvedSidetocConfig = {
  root: HTMLElement
  attrs: SidetocAttrs
}

export const jsSidetoc = (() => {
  const listenerMap = new WeakMap<HTMLElement, Record<string, EventListener>>()

  const defaultConfig: ResolvedSidetocConfig = {
    root: document.body,
    attrs: {
      container: "data-sidetoc",
      targetArea: "data-sidetoc-target",
      sourceToc: "#table-of-contents + ul",
    },
  }

  function bindOnce(
    el: HTMLElement,
    key: string,
    type: string,
    handler: EventListener
  ) {
    const map = listenerMap.get(el) ?? {}
    if (map[key]) return
    el.addEventListener(type, handler)
    map[key] = handler
    listenerMap.set(el, map)
  }

  function setActiveLink(id: string, links: HTMLElement[]) {
    links.forEach((link) => {
      const href = link.getAttribute("href")
      if (href === `#${id}`) {
        link.classList.add("is-active")
      } else {
        link.classList.remove("is-active")
      }
    })
  }

  function copyToc(config: ResolvedSidetocConfig) {
    const { root, attrs } = config
    const sourceEl = root.querySelector(attrs.sourceToc) as HTMLElement
    const containerEl = root.querySelector(
      `[${attrs.container}]`
    ) as HTMLElement

    if (!sourceEl || !containerEl || containerEl.children.length > 0) return

    const clone = sourceEl.cloneNode(true) as HTMLElement
    containerEl.appendChild(clone)
    containerEl.style.opacity = "1"
  }

  function highlightToc(config: ResolvedSidetocConfig) {
    const { root, attrs } = config

    const headings = Array.from(
      root.querySelectorAll(
        `[${attrs.targetArea}] > :is(h2, h3):not(#table-of-contents)`
      )
    ) as HTMLElement[]

    const links = Array.from(
      root.querySelectorAll(
        `[${attrs.container}] a, [${attrs.targetArea}] > :is(h2, h3):not(#table-of-contents) > a`
      )
    ) as HTMLElement[]

    if (headings.length === 0 || links.length === 0) return

    links.forEach((link) => {
      bindOnce(link, "tocClick", "click", () => {
        const id = link.getAttribute("href")?.replace("#", "")
        if (id) setActiveLink(id, links)
      })
    })

    const observer = new IntersectionObserver(
      (entries) => {
        const intersectingEntries = entries.filter((e) => e.isIntersecting)

        if (intersectingEntries.length > 0) {
          const firstEntry = intersectingEntries.reduce((prev, curr) =>
            prev.boundingClientRect.top < curr.boundingClientRect.top
              ? prev
              : curr
          )
          const id = firstEntry.target.id
          if (id) setActiveLink(id, links)
        } else {
          entries.forEach((entry) => {
            const isBottom = Math.sign(entry.boundingClientRect.top) !== -1
            if (isBottom) {
              const id = entry.target.id
              const ids = headings.map((h) => h.id)
              const index = ids.indexOf(id)
              if (index > 0) setActiveLink(ids[index - 1], links)
            }
          })
        }
      },
      { root: null, rootMargin: "0px 0px -70% 0px", threshold: 0 }
    )
    headings.forEach((heading) => observer.observe(heading))
  }

  function init(config?: SidetocConfig) {
    const resolvedConfig = {
      ...defaultConfig,
      ...config,
      attrs: { ...defaultConfig.attrs, ...config?.attrs },
    } as ResolvedSidetocConfig
    const { root } = resolvedConfig

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width >= 992) {
          copyToc(resolvedConfig)
          highlightToc(resolvedConfig)
          resizeObserver.disconnect()
          break
        }
      }
    })
    resizeObserver.observe(root)
  }

  return { init }
})()
