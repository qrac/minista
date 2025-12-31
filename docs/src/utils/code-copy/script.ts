type Attrs = {
  target: string
  button: string
  pre: string
  code: string
  copiedText: string
  copiedDuration: string
}

type Config = {
  root?: HTMLElement
  attrs?: Partial<Attrs>
}

type ResolvedConfig = {
  root: HTMLElement
  attrs: Attrs
}

export const jsCodeCopy = (() => {
  const listenerMap = new WeakMap<HTMLElement, Record<string, EventListener>>()

  const defaultConfig: ResolvedConfig = {
    root: document.body,
    attrs: {
      target: ".docs [data-rehype-pretty-code-figure]",
      button: "[data-code-copy]",
      pre: "pre",
      code: "code",
      copiedText: "Copied!",
      copiedDuration: "1200",
    },
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

  function ensureButtons(config: ResolvedConfig) {
    const { root, attrs } = config
    const figures = Array.from(
      root.querySelectorAll(attrs.target)
    ) as HTMLElement[]
    for (const fig of figures) {
      if (fig.querySelector(attrs.button)) continue
      const btn = document.createElement("button")
      btn.type = "button"
      btn.setAttribute("data-code-copy", "")
      btn.innerHTML = `
        <span data-code-copy-copied>${attrs.copiedText}</span>
        <svg
          stroke="currentColor"
          fill="none"
          stroke-width="2"
          viewBox="0 0 24 24"
          stroke-linecap="round"
          stroke-linejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        `
      fig.insertAdjacentElement("beforeend", btn)
    }
  }

  function getLanguage(pre: HTMLElement) {
    return (pre as HTMLElement).dataset.language?.toLowerCase() ?? ""
  }

  function normalizeShellForCopy(text: string) {
    return text
      .split("\n")
      .map((line) => line.replace(/^\s*(?:\$|#)\s?/, ""))
      .join("\n")
  }

  async function writeClipboard(text: string) {
    await navigator.clipboard.writeText(text)
  }

  const timerMap = new WeakMap<HTMLElement, number>()

  function setCopiedState(config: ResolvedConfig, btn: HTMLElement) {
    const { attrs } = config

    const t = timerMap.get(btn)
    if (t) window.clearTimeout(t)

    btn.setAttribute("data-code-copy", "is-copied")

    const duration = Number(attrs.copiedDuration) || 1200
    const id = window.setTimeout(() => {
      btn.setAttribute("data-code-copy", "")
      timerMap.delete(btn)
    }, duration)
    timerMap.set(btn, id)
  }

  async function onClickCopy(config: ResolvedConfig, btn: HTMLElement) {
    const { attrs } = config
    const fig = btn.closest(attrs.target) as HTMLElement | null
    if (!fig) return
    const pre = fig.querySelector(attrs.pre) as HTMLElement | null
    const code = fig.querySelector(attrs.code) as HTMLElement | null
    if (!pre || !code) return
    let text = code.innerText
    const lang = getLanguage(pre)
    if (["sh", "bash", "zsh", "shell", "console"].includes(lang)) {
      text = normalizeShellForCopy(text)
    }
    await writeClipboard(text)
    setCopiedState(config, btn)
  }

  function wireRootDelegation(config: ResolvedConfig) {
    const { root, attrs } = config
    bindOnce(root, "codeCopyClick", "click", (e: Event) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const btn = target.closest(attrs.button) as HTMLElement | null
      if (!btn) return
      void onClickCopy(config, btn)
    })
  }

  function init(config?: Config) {
    const resolvedConfig = {
      ...defaultConfig,
      ...config,
      attrs: { ...defaultConfig.attrs, ...config?.attrs },
    } as ResolvedConfig
    ensureButtons(resolvedConfig)
    wireRootDelegation(resolvedConfig)
  }

  return { init }
})()
