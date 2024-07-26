import type { Plugin, UserConfig } from "vite"
import fs from "node:fs"
import path from "node:path"

import {
  checkDeno,
  getCwd,
  getPluginName,
  getTempName,
  getRootDir,
  getTempDir,
} from "minista-shared-utils"

import type { PluginOptions } from "./option.js"
import { getPartialCode, getHydrateCode, getGlobImportCode } from "./code.js"

export function pluginHydrateServe(opts: PluginOptions): Plugin {
  const isDeno = checkDeno()
  const cwd = getCwd(isDeno)
  const names = ["hydrate", "serve"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)
  const regCwd = new RegExp("^" + cwd)
  const aliasCwd = `/@${tempName}-cwd`
  const aliasGlob = `/@${tempName}-glob`

  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""
  let hydrateDir = ""
  let hydrateItems: { serial: number; aliasPath: string }[] = []

  return {
    name: pluginName,
    enforce: "pre",
    apply: "serve",
    config: async (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      globDir = path.join(tempDir, "glob")
      globFile = path.join(globDir, `${tempName}.js`)
      hydrateDir = path.join(tempDir, "hydrate")

      const regRoot = new RegExp("^" + rootDir)
      const shortHydrateDir = hydrateDir.replace(regRoot, "")
      const code = getGlobImportCode(shortHydrateDir, "serve")
      await fs.promises.mkdir(globDir, { recursive: true })
      await fs.promises.writeFile(globFile, code, "utf8")

      return {
        resolve: {
          alias: [
            {
              find: aliasCwd,
              replacement: cwd,
            },
            {
              find: aliasGlob,
              replacement: globFile,
            },
          ],
        },
        optimizeDeps: {
          include: ["react", "react-dom/client"],
        },
      } as UserConfig
    },
    async load(id) {
      if (/\.[jt]sx?\?ph$/.test(id)) {
        const aliasPath = id.replace(regCwd, aliasCwd).replace(/\?ph.*$/, "")

        let hydrateItem = hydrateItems.find(
          (item) => item.aliasPath === aliasPath
        )
        if (!hydrateItem) {
          const serial = hydrateItems.length + 1
          hydrateItem = { serial, aliasPath }
          hydrateItems.push(hydrateItem)
          const hydrateServeDir = path.join(hydrateDir, "serve")
          const fileName = path.join(hydrateServeDir, `${serial}.jsx`)
          const code = getHydrateCode(serial, aliasPath, opts)
          await fs.promises.mkdir(hydrateServeDir, { recursive: true })
          await fs.promises.writeFile(fileName, code, "utf8")
        }
        return getPartialCode(hydrateItem.serial, aliasPath, opts)
      }
    },
    transformIndexHtml(html) {
      const scriptTag = `<script type="module" src="${aliasGlob}"></script>`
      return html.replace("</head>", `${scriptTag}</head>`)
    },
  }
}
