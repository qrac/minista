type Attrs = {
  target: string
  open: string
  close: string
  closeDelay: string
}
type Config = {
  root?: HTMLElement
  attrs?: Partial<Attrs>
}
type ResolvedConfig = {
  root: HTMLElement
  attrs: Attrs
}

export const jsModal = (() => {
  let lockCount = 0
  let lastScrollY = 0

  const listenerMap = new WeakMap<HTMLElement, Record<string, EventListener>>()

  const defaultConfig: ResolvedConfig = {
    root: document.body,
    attrs: {
      target: "data-modal",
      open: "data-modal-open",
      close: "data-modal-close",
      closeDelay: "data-modal-close-delay",
    },
  }

  function getScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth
  }

  function lockScroll() {
    lockCount++
    if (lockCount > 1) return

    lastScrollY = window.scrollY || window.pageYOffset || 0
    const sbw = getScrollbarWidth()

    const b = document.body as HTMLBodyElement
    b.style.position = "fixed"
    b.style.top = `-${lastScrollY}px`
    b.style.left = "0"
    b.style.right = "0"
    b.style.width = "100%"
    if (sbw > 0) b.style.paddingRight = `${sbw}px`
  }

  function unlockScroll() {
    if (lockCount === 0) return
    lockCount--
    if (lockCount > 0) return

    const b = document.body as HTMLBodyElement
    b.style.position = ""
    b.style.top = ""
    b.style.left = ""
    b.style.right = ""
    b.style.width = ""
    b.style.paddingRight = ""
    window.scrollTo(0, lastScrollY)
  }

  function bindOnce(
    el: HTMLElement,
    key: string,
    type: keyof HTMLElementEventMap,
    handler: EventListener
  ) {
    const map = listenerMap.get(el) ?? {}
    if (map[key]) return
    el.addEventListener(type, handler as any)
    map[key] = handler
    listenerMap.set(el, map)
  }

  function animateClose(modalEl: HTMLDialogElement) {
    if (!modalEl.open) return
    if (modalEl.classList.contains("is-closing")) return

    modalEl.classList.add("is-closing")

    const onEnd = (e: Event) => {
      if (e instanceof TransitionEvent && e.propertyName !== "opacity") return
      modalEl.removeEventListener("transitionend", onEnd)
      modalEl.classList.remove("is-closing")
      modalEl.close()
    }
    modalEl.addEventListener("transitionend", onEnd)
    void modalEl.offsetWidth
  }

  function onClickOpen(
    config: ResolvedConfig,
    root: HTMLElement,
    openEl: HTMLElement
  ) {
    const { attrs } = config
    const id = openEl.getAttribute(attrs.open)
    const targetEl = root.querySelector(
      `[${attrs.target}="${id}"]`
    ) as HTMLDialogElement | null
    if (!targetEl) return

    targetEl.showModal()
    lockScroll()
  }

  function onClickClose(
    config: ResolvedConfig,
    root: HTMLElement,
    closeEl: HTMLElement
  ) {
    const { attrs } = config
    const id = closeEl.getAttribute(attrs.close)
    const delay = closeEl.getAttribute(attrs.closeDelay)
    const modalEl = root.querySelector(
      `[${attrs.target}="${id}"]`
    ) as HTMLDialogElement | null
    if (!modalEl) return
    if (delay) {
      setTimeout(() => animateClose(modalEl), Number(delay))
      return
    }
    animateClose(modalEl)
  }

  function wireDialogEvents(modalEl: HTMLDialogElement) {
    bindOnce(modalEl, "backdropClick", "click", (e: Event) => {
      const ev = e as MouseEvent
      if (ev.target === modalEl) {
        animateClose(modalEl)
      }
    })
    bindOnce(modalEl, "cancel", "cancel", (e: Event) => {
      e.preventDefault()
      animateClose(modalEl)
    })
    bindOnce(modalEl, "close", "close", () => unlockScroll())
  }

  function init(config?: Config) {
    const resolvedConfig = {
      ...defaultConfig,
      ...config,
      attrs: { ...defaultConfig.attrs, ...config?.attrs },
    } as ResolvedConfig
    const { root, attrs } = resolvedConfig

    const openEls = Array.from(
      root.querySelectorAll(`[${attrs.open}]`)
    ) as HTMLElement[]
    for (const openEl of openEls) {
      bindOnce(openEl, "openClick", "click", () =>
        onClickOpen(resolvedConfig, root, openEl)
      )
    }
    const closeEls = Array.from(
      root.querySelectorAll(`[${attrs.close}]`)
    ) as HTMLElement[]
    for (const closeEl of closeEls) {
      bindOnce(closeEl, "closeClick", "click", () =>
        onClickClose(resolvedConfig, root, closeEl)
      )
    }
    const modalEls = Array.from(
      root.querySelectorAll(`[${attrs.target}]`)
    ) as HTMLDialogElement[]
    for (const modalEl of modalEls) {
      wireDialogEvents(modalEl)
    }
  }

  function resetState() {
    lockCount = 0
    lastScrollY = 0
  }

  return { init, resetState }
})()
