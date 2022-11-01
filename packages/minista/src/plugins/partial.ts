import type { Plugin } from "vite"
import path from "node:path"
import fs from "fs-extra"

import type { ResolvedConfig } from "../config/index.js"

function transformStatic({
  originalId,
  rootDOMElement,
  dataAttr,
  style,
}: {
  originalId: string
  rootDOMElement: string
  dataAttr: string
  style: string
}) {
  return `import App from "${originalId}"
export default function () {
  return (
    <${rootDOMElement} ${dataAttr} style={${style}}>
      <App />
    </${rootDOMElement}>
  )
}`
}

function transformHydrate({
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

export function pluginPartial(config: ResolvedConfig): Plugin {
  let useLegacy = false
  let partials: { [key: string]: number } = {}

  return {
    name: "minista-vite-plugin:partial",
    config: () => {
      return {
        optimizeDeps: {
          include: ["react-dom/client"],
        },
      }
    },
    async configResolved() {
      const rootReactDomPkgPath = path.join(
        config.sub.resolvedRoot,
        "node_modules",
        "react-dom",
        "package.json"
      )
      const cwdReactDomPkgPath = path.join(
        process.cwd(),
        "node_modules",
        "react-dom",
        "package.json"
      )
      const hasRoot = fs.existsSync(rootReactDomPkgPath)
      const hasCwd = fs.existsSync(cwdReactDomPkgPath)

      if (!hasRoot && !hasCwd) {
        return
      }

      const reactDomPkgPath = hasRoot ? rootReactDomPkgPath : cwdReactDomPkgPath
      const reactDomPkg = JSON.parse(fs.readFileSync(reactDomPkgPath, "utf8"))
      const version = reactDomPkg.version.match(/[0-9]*(?=\.)/)[0]

      useLegacy = version < 18 ? true : false
    },
    async buildStart() {
      await fs.remove(path.join(config.sub.tempDir, "partials"))
    },
    async load(id) {
      if (id.endsWith("?ph")) {
        let count = 0
        const originalId = id.replace(/\?ph$/, "")
        const rootDOMElement = config.main.assets.partial.rootDOMElement
        const rootAttrSuffix = config.main.assets.partial.rootAttrSuffix
        const rootValuePrefix = config.main.assets.partial.rootValuePrefix
        const style = JSON.stringify(config.main.assets.partial.rootStyle)

        if (!Object.hasOwn(partials, id)) {
          count = Object.keys(partials).length + 1
          partials[id] = count

          await fs
            .outputFile(
              path.join(config.sub.tempDir, "partials", `ph-${count}.jsx`),
              transformHydrate({
                originalId,
                dataAttr: `data-${rootAttrSuffix}="${rootValuePrefix}-${count}"`,
                useLegacy,
                useIntersectionObserver:
                  config.main.assets.partial.useIntersectionObserver,
                options: config.main.assets.partial.intersectionObserverOptions,
              })
            )
            .catch((err) => {
              console.error(err)
            })
        } else {
          count = partials[id]
        }
        return transformStatic({
          originalId,
          rootDOMElement,
          dataAttr: `data-${rootAttrSuffix}="${rootValuePrefix}-${count}"`,
          style,
        })
      }
    },
  }
}
