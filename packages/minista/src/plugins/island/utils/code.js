/** @typedef {import('../types').PluginOptions} PluginOptions */

/**
 * @param {string} snippet
 * @param {number} snippetIndex
 * @param {PluginOptions} opts
 * @returns {string}
 */
export function getIslandServeCode(snippet, snippetIndex, opts) {
  const { rootAttrName } = opts
  const prefix = rootAttrName ? `${rootAttrName}-` : ""

  const reactDomImportLine = `import * as ReactDOM from "react-dom/client"`
  const reactDomConstLine = `const { hydrateRoot, createRoot } = ReactDOM`

  const componentLine = snippet.replace(
    "export default function",
    "const Component = function"
  )
  const hydrateCall = `function run() {
  const els = document.querySelectorAll('[data-${prefix}client-snippet="${snippetIndex}"]')

  if (!els.length) return

  els.forEach((el) => {
    const directive = el.getAttribute("data-${prefix}client-directive")

    let params:any = {}
    const rawParams = el.getAttribute("data-${prefix}client-directive-params")
    if (directive === "media") {
      params = rawParams
    } else {
      params = JSON.parse(rawParams || "{}")
    }

    let children = el.innerHTML
    children = children.replace(/\\>[\\r\\n ]+/g, '>')
    el.innerHTML = children

    const firstChild = el.firstElementChild;
    const timeout = params?.timeout || undefined
    const idleOptions = timeout ? { timeout } : {}
    const root = params?.root || null
    const rootMargin = params?.rootMargin || "0px"
    const threshold = params?.threshold || 0
    const visibleOptions = { root, rootMargin, threshold }

    switch (directive) {
      case "load":
        hydrateRoot(el, <Component />)
        break
      case "idle":
        if ("requestIdleCallback" in window) {
          requestIdleCallback(() => hydrateRoot(el, <Component />), idleOptions)
        } else {
          setTimeout(() => hydrateRoot(el, <Component />), timeout || 0)
        }
        break
      case "visible":
        if (!firstChild) break
        const observer = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              hydrateRoot(el, <Component />)
              obs.disconnect()
            }
          })
        }, visibleOptions)
        observer.observe(firstChild)
        break
      case "media":
        const mql = window.matchMedia(params)
        const onChange = (e) => {
          if (e.matches) {
            hydrateRoot(el, <Component />)
            if (mql.removeEventListener) mql.removeEventListener("change", onChange)
          }
        }
        if (mql.addEventListener) mql.addEventListener("change", onChange)
        if (mql.matches) onChange(mql)
        break
      case "only":
        createRoot(el).render(<Component />)
        break
      default:
        console.warn("Unknown directive:", directive)
    }
  })
}
run()`
  return [
    [reactDomImportLine].join("\n"),
    [reactDomConstLine, componentLine].join("\n"),
    hydrateCall,
  ].join("\n\n")
}

/**
 * @param {number[]} pattern
 * @param {PluginOptions} opts
 * @returns {string}
 */
export function getIslandBuildCode(pattern, opts) {
  const { rootAttrName } = opts
  const prefix = rootAttrName ? `${rootAttrName}-` : ""

  const reactDomImportLine = `import * as ReactDOM from "react-dom/client"`
  const reactDomConstLine = `const { hydrateRoot, createRoot } = ReactDOM`

  const snippetImportLines = pattern.map((i) => {
    return `import Component${i} from "./snippets/snippet-${i}"`
  })
  const componentList = pattern.map((i) => {
    return `${i}: Component${i}`
  })
  const componentListLine = `const components = {${componentList.join(", ")}}`
  const hydrateCall = `function run() {
  const els = document.querySelectorAll("[data-${prefix}client-snippet]")

  if (!els.length) return

  els.forEach((el) => {
    const id = Number(el.getAttribute("data-${prefix}client-snippet"))
    const directive = el.getAttribute("data-${prefix}client-directive")
    const Component = components[Number(id)]

    if (!Component) return

    let params:any = {}
    const rawParams = el.getAttribute("data-${prefix}client-directive-params")
    if (directive === "media") {
      params = rawParams
    } else {
      params = JSON.parse(rawParams || "{}")
    }

    let children = el.innerHTML
    children = children.replace(/\\>[\\r\\n ]+/g, '>')
    el.innerHTML = children

    const firstChild = el.firstElementChild;
    const timeout = params?.timeout || undefined
    const idleOptions = timeout ? { timeout } : {}
    const root = params?.root || null
    const rootMargin = params?.rootMargin || "0px"
    const threshold = params?.threshold || 0
    const visibleOptions = { root, rootMargin, threshold }

    switch (directive) {
      case "load":
        hydrateRoot(el, <Component />)
        break
      case "idle":
        if ("requestIdleCallback" in window) {
          requestIdleCallback(() => hydrateRoot(el, <Component />), idleOptions)
        } else {
          setTimeout(() => hydrateRoot(el, <Component />), timeout || 0)
        }
        break
      case "visible":
        if (!firstChild) break
        const observer = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              hydrateRoot(el, <Component />)
              obs.disconnect()
            }
          })
        }, visibleOptions)
        observer.observe(firstChild)
        break
      case "media":
        const mql = window.matchMedia(params)
        const onChange = (e) => {
          if (e.matches) {
            hydrateRoot(el, <Component />)
            if (mql.removeEventListener) mql.removeEventListener("change", onChange)
          }
        }
        if (mql.addEventListener) mql.addEventListener("change", onChange)
        if (mql.matches) onChange(mql)
        break
      case "only":
        createRoot(el).render(<Component />)
        break
      default:
        console.warn("Unknown directive:", directive)
    }
  })
}
run()`
  return [
    [reactDomImportLine].join("\n"),
    snippetImportLines.join("\n"),
    [reactDomConstLine, componentListLine].join("\n"),
    hydrateCall,
  ].join("\n\n")
}
