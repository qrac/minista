import type { ResolvedConfig } from "../config/index.js"

export function transformHydrate({
  originalId,
  dataAttr,
  useLegacy,
  useIntersectionObserver,
  options,
}: {
  originalId: string
  dataAttr: string
  useLegacy: boolean
  useIntersectionObserver: boolean
  options: ResolvedConfig["main"]["assets"]["partial"]["intersectionObserverOptions"]
}) {
  let hydrateStr = ""
  let hydrateFncStr = ""

  hydrateStr = "ReactDOM.hydrateRoot(target, <App />)"
  hydrateStr = useLegacy ? "ReactDOM.hydrate(<App />, target)" : hydrateStr

  hydrateFncStr = `const options = {
      root: ${options.root},
      rootMargin: "${options.rootMargin}",
      thresholds: [${options.thresholds.join()}],
    }
    const observer = new IntersectionObserver(hydrate, options)
    observer.observe(target)
    function hydrate() {
      ${hydrateStr}
      observer.unobserve(target)
    }`
  hydrateFncStr = !useIntersectionObserver ? hydrateStr : hydrateFncStr

  return `import * as ReactDOM from "react-dom/client"
import App from "${originalId}"
const targets = document.querySelectorAll('[${dataAttr}]')
if (targets) {
  targets.forEach(target => {
    let children = target.innerHTML
    children = children.replace(/((?<=\\>)(\\s|\\n)*(\\s|\\n))|((\\s|\\n)*(\\s|\\n)(?=\\<))/g, "")
    target.innerHTML = children
    ${hydrateFncStr}
  })
}`
}
