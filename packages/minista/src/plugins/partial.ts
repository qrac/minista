import type { Plugin } from "vite"
import path from "node:path"
import fs from "fs-extra"

import type { ResolvedConfig } from "../config/index.js"
import { transformPartial } from "../transform/partial.js"
import { transformHydrate } from "../transform/hydrate.js"

export function pluginPartial(config: ResolvedConfig): Plugin {
  let useLegacy = false
  let partials: { [key: string]: number } = {}

  const tempPhsDir = path.join(config.sub.tempDir, "phs")

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
      await fs.remove(tempPhsDir)
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
              path.join(tempPhsDir, `ph-${count}.jsx`),
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
        return transformPartial({
          originalId,
          rootDOMElement,
          dataAttr: `data-${rootAttrSuffix}="${rootValuePrefix}-${count}"`,
          style,
        })
      }
    },
  }
}
