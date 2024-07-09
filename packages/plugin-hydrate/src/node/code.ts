import type { PluginOptions } from "./option.js"

export function getPartialCode(
  serial: number,
  aliasPath: string,
  opts: PluginOptions
) {
  const { rootDOMElement, rootAttrSuffix, rootValuePrefix, rootStyle } = opts
  const dataAttr = `data-${rootAttrSuffix}="${rootValuePrefix}-${serial}"`
  const style = JSON.stringify(rootStyle)
  return `import App from "${aliasPath}"
export default function () {
  return (
    <${rootDOMElement} ${dataAttr} style={${style}}>
      <App />
    </${rootDOMElement}>
  )
}`
}

export function getHydrateCode(
  serial: number,
  aliasPath: string,
  opts: PluginOptions
) {
  const {
    rootAttrSuffix,
    rootValuePrefix,
    useIntersectionObserver,
    intersectionObserverOptions,
  } = opts
  const dataAttr = `data-${rootAttrSuffix}="${rootValuePrefix}-${serial}"`
  const hydrateStr = "ReactDOM.hydrateRoot(target, <App />)"
  const hydrateFncStr = `const options = {
      root: ${intersectionObserverOptions.root},
      rootMargin: "${intersectionObserverOptions.rootMargin}",
      thresholds: [${intersectionObserverOptions.thresholds.join()}],
    }
    const observer = new IntersectionObserver(hydrate, options)
    observer.observe(target)
    function hydrate() {
      ${hydrateStr}
      observer.unobserve(target)
    }`
  return `import React from "react"
import * as ReactDOM from "react-dom/client"
import App from "${aliasPath}"
const targets = document.querySelectorAll('[${dataAttr}]')
if (targets) {
  targets.forEach(target => {
    let children = target.innerHTML
    children = children.replace(/((?<=\\>)(\\s|\\n)*(\\s|\\n))|((\\s|\\n)*(\\s|\\n)(?=\\<))/g, "")
    target.innerHTML = children
    ${useIntersectionObserver ? hydrateFncStr : hydrateStr}
  })
}`
}

export function getConcatCode(serials: number[], subDir: string) {
  return serials.map((serial) => `import "./${subDir}/${serial}"`).join("\n")
}

export function getGlobImportCode(rootPath: string, subDir: string): string {
  return `import.meta.glob(["${rootPath}/${subDir}/*.jsx"], { eager: true })`
}
