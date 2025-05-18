/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('vite').ViteDevServer} ViteDevServer */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"

import { transformDirectives } from "./utils/directive.js"
import { decodeSnippet } from "./utils/snippet.js"
import { getIslandServeCode } from "./utils/code.js"
import { getPluginName, getTempName } from "../../shared/name.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { mergeAlias } from "../../shared/vite.js"

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginIslandServe(opts) {
  const cwd = process.cwd()
  const names = ["island", "serve"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)
  const islandAlias = `/@${tempName}`

  let rootDir = ""
  let tempDir = ""
  let islandDir = ""
  /** @type {Set<string>} */
  let uniqueSnippets = new Set()
  /** @type {ViteDevServer} */
  let viteServer
  /** @type {SsgPage[]} */
  let ssgPages = []

  return {
    name: pluginName,
    enforce: "pre",
    apply: "serve",
    config: async (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      islandDir = path.resolve(tempDir, "island/serve")

      await fs.promises.mkdir(islandDir, { recursive: true })
      return {
        resolve: {
          alias: mergeAlias(config, [
            {
              find: islandAlias,
              replacement: islandDir,
            },
          ]),
        },
        optimizeDeps: {
          include: ["react", "react-dom/client"],
        },
      }
    },
    configureServer(server) {
      viteServer = server
    },
    async transform(code, id) {
      if (!/\.(tsx|jsx)$/.test(id)) return null

      let newCode = code

      if (code.includes("client:")) {
        const { code: transformdCode, snippets } = transformDirectives(
          code,
          id,
          opts
        )
        newCode = transformdCode

        for (const snippet of snippets) {
          if (uniqueSnippets.has(snippet)) continue
          uniqueSnippets.add(snippet)
        }
      }
      return {
        code: newCode,
        map: null,
      }
    },
    async transformIndexHtml(html) {
      if (viteServer) {
        const mod = await viteServer.ssrLoadModule("virtual:ssg-pages")
        ssgPages = mod.default ?? mod

        if (ssgPages && ssgPages.length > 0) {
          uniqueSnippets = new Set(
            [...uniqueSnippets].filter((snippet) =>
              ssgPages.some(({ html }) => html.includes(snippet))
            )
          )
        }
      }
      const snippetList = [...uniqueSnippets]

      if (snippetList.length === 0) return html

      let newHtml = html

      await Promise.all(
        snippetList.map(async (snippet, index) => {
          const snippetIndex = index + 1
          const fileName = `island-${snippetIndex}.tsx`
          const fullPath = path.resolve(islandDir, fileName)
          const code = getIslandServeCode(
            decodeSnippet(snippet),
            snippetIndex,
            opts
          )
          const timestamp = Date.now()
          const script = `<script type="module" src="${islandAlias}/${fileName}?=${timestamp}"></script>`
          await fs.promises.writeFile(fullPath, code, "utf8")
          newHtml = newHtml.replaceAll(snippet, `${snippetIndex}`)
          newHtml = newHtml.replace(/<\/head>/, `${script}</head>`)
        })
      )
      return newHtml
    },
  }
}
