import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import type { ResolvedConfig } from "../config/index.js"

function staticPartial({
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
export default function Wrapped() {
  return (
    <${rootDOMElement} ${dataAttr} style={${style}}>
      <App />
    </${rootDOMElement}>
  )
}`
}

function hydratePartial({
  originalId,
  dataAttr,
}: {
  originalId: string
  dataAttr: string
}) {
  return `import React from "react"
import * as ReactDOM from "react-dom/client"
import App from "${originalId}"
const targets = document.querySelectorAll('[${dataAttr}]')
if (targets) {
  targets.forEach(target => {
    ReactDOM.hydrateRoot(target, <App />)
  })
}`
}

export function pluginPartial(config: ResolvedConfig): Plugin {
  let partials: { [key: string]: number } = {}

  return {
    name: "minista-vite-plugin:partial",
    config: () => ({
      build: {
        rollupOptions: {
          input: {
            __minista_plugin_partial: path.join(
              __dirname,
              "/../scripts/partial.js"
            ),
          },
        },
      },
      optimizeDeps: {
        include: ["react-dom/client"],
      },
    }),
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
              hydratePartial({
                originalId,
                dataAttr: `data-${rootAttrSuffix}="${rootValuePrefix}-${count}"`,
              })
            )
            .catch((err) => {
              console.error(err)
            })
        } else {
          count = partials[id]
        }
        return staticPartial({
          originalId,
          rootDOMElement,
          dataAttr: `data-${rootAttrSuffix}="${rootValuePrefix}-${count}"`,
          style,
        })
      }
    },
  }
}
