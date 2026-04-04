/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('vite').ViteDevServer} ViteDevServer */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "url"
import { glob } from "tinyglobby"
import { normalizePath } from "vite"

import { transformDirectives } from "./utils/directive.js"
import { decodeSnippet } from "./utils/snippet.js"
import { getIslandServeCode, getIslandBuildCode } from "./utils/code.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import {
  getServeBase,
  getBuildBase,
  getBasedAssetUrl,
} from "../../shared/url.js"
import {
  mergeAlias,
  filterOutputChunks,
  filterOutputAssets,
} from "../../shared/vite.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  useSplitPages: true,
  outName: "island-[index]",
  rootAttrName: "island",
  rootDOMElement: "div",
  rootStyle: { display: "contents" },
}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginIsland(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = { ...defaultOptions, ...uOpts }
  const cwd = process.cwd()
  const islandAlias = `/@__minista-island`
  const tempName = "__minista-island"

  let isDev = false
  let isSsr = false
  let isBuild = false

  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let islandDir = ""
  let snippetsDir = ""
  let snippetsFile = ""
  /** @type {string[]} */
  let snippetList = []
  /** @type {Set<string>} */
  let uniqueSnippets = new Set()
  /** @type {ViteDevServer} */
  let viteServer
  let ssgDir = ""
  /** @type {SsgPage[]} */
  let ssgPages = []
  let patternIndex = 0
  /** @type {{[patternId: string]: number}} */
  let patternIndexMap = {}
  /** @type {{[htmlFileName: string]: string}} */
  let pagePatternMap = {}
  /** @type {{[pathId: string]: string}} */
  let entries = {}
  /** @type {{[patternIndex: string]: string}} */
  let entryChanges = {}
  /** @type {{[patternIndex: string]: string[]}} */
  let importedCssMap = {}

  return {
    name: "vite-plugin:minista-island",
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isDev || isSsr || isBuild
    },
    config: async (config) => {
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)

      if (isDev) {
        base = getServeBase(config.base || base)
        islandDir = path.resolve(tempDir, "island/serve")
        await fs.promises.mkdir(islandDir, { recursive: true })
        return {
          resolve: {
            alias: mergeAlias(config, [
              {
                find: islandAlias,
                replacement: normalizePath(islandDir),
              },
            ]),
          },
          optimizeDeps: {
            include: ["react", "react-dom/client"],
          },
        }
      }
      if (isSsr || isBuild) {
        base = getBuildBase(config.base || base)
        islandDir = path.resolve(tempDir, "island/build")
        snippetsDir = path.resolve(tempDir, "island/build/snippets")
        snippetsFile = path.resolve(islandDir, `${tempName}-snippets.mjs`)
        ssgDir = path.resolve(tempDir, "ssg")

        await fs.promises.mkdir(islandDir, { recursive: true })
        await fs.promises.mkdir(snippetsDir, { recursive: true })

        if (isSsr) return
        if (!fs.existsSync(snippetsFile)) return

        const snippetsFileUrl = pathToFileURL(snippetsFile).href

        /** @type {{ssrSnippetList: string[]}} */
        const { ssrSnippetList } = await import(snippetsFileUrl)

        snippetList = ssrSnippetList
        if (!snippetList || snippetList.length === 0) return

        const ssgFiles = await glob("*.mjs", { cwd: ssgDir })
        if (!ssgFiles.length) return

        ssgPages = (
          await Promise.all(
            ssgFiles.map(async (file) => {
              const ssgFileUrl = pathToFileURL(path.resolve(ssgDir, file)).href
              const { ssgPages } = await import(ssgFileUrl)
              return ssgPages
            }),
          )
        ).flat()

        if (!ssgPages.length) return

        for (const ssgPage of ssgPages) {
          const { html, fileName: htmlFileName } = ssgPage

          /** @type {number[]} */
          let pattern = []

          if (opts.useSplitPages) {
            snippetList.forEach((snippet, index) => {
              const snippetIndex = index + 1
              if (html.includes(snippet)) pattern.push(snippetIndex)
            })
          } else {
            const hasIsland = snippetList.some((snippet) =>
              html.includes(snippet),
            )
            if (hasIsland) {
              snippetList.forEach((_, index) => {
                const snippetIndex = index + 1
                return pattern.push(snippetIndex)
              })
            }
          }
          const patternId = pattern.join(",")

          if (!patternIndexMap[patternId] && patternId) {
            patternIndex = patternIndex + 1
            patternIndexMap[patternId] = patternIndex
          }
          if (patternId) {
            pagePatternMap[htmlFileName] = patternId
          }
        }
        for (const [page, pattern] of Object.entries(pagePatternMap)) {
          const patternIndex = patternIndexMap[pattern]
          pagePatternMap[page] = String(patternIndex)
        }

        await Promise.all(
          snippetList.map(async (snippet, index) => {
            const snippetIndex = index + 1
            const fileName = `snippet-${snippetIndex}.tsx`
            const fullPath = path.resolve(snippetsDir, fileName)
            const code = decodeSnippet(snippet)
            await fs.promises.writeFile(fullPath, code, "utf8")
          }),
        )

        await Promise.all(
          Object.entries(patternIndexMap).map(async ([patternId, index]) => {
            const fileName = `${opts.outName}.tsx`.replace(
              /\[index\]/g,
              String(index),
            )
            const fullPath = path.resolve(islandDir, fileName)
            const pattern = patternId.split(",").map((i) => Number(i))
            const code = getIslandBuildCode(pattern, opts)
            await fs.promises.writeFile(fullPath, code, "utf8")
            const pathId = path.parse(fileName).name
            entries[pathId] = fullPath
          }),
        )

        return {
          build: {
            rollupOptions: {
              input: entries,
            },
          },
        }
      }
    },
    configureServer(server) {
      viteServer = server
    },
    async transformIndexHtml(html) {
      if (viteServer) {
        const mod = await viteServer.ssrLoadModule("virtual:ssg-pages")
        ssgPages = mod.default ?? mod

        if (ssgPages && ssgPages.length > 0) {
          uniqueSnippets = new Set(
            [...uniqueSnippets].filter((snippet) =>
              ssgPages.some(({ html }) => html.includes(snippet)),
            ),
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
            opts,
          )
          const timestamp = Date.now()
          const prefixBase = base.replace(/\/$/, "")
          const scriptSrc = `${prefixBase}${islandAlias}/${fileName}?=${timestamp}`
          const script = `<script type="module" src="${scriptSrc}"></script>`
          await fs.promises.writeFile(fullPath, code, "utf8")
          newHtml = newHtml.replaceAll(snippet, `${snippetIndex}`)
          newHtml = newHtml.replace(/<\/head>/, `${script}</head>`)
        }),
      )
      return newHtml
    },
    async transform(code, id) {
      if (isBuild) return null
      if (!/\.(tsx|jsx)$/.test(id)) return null

      let newCode = code

      if (code.includes("client:")) {
        const { code: transformdCode, snippets } = transformDirectives(
          code,
          id,
          opts,
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
    generateBundle(options, bundle) {
      if (isSsr) return

      const outputChunks = filterOutputChunks(bundle)
      const outputAssets = filterOutputAssets(bundle)
      const entryIds = Object.keys(entries)

      if (entryIds.length === 0) return

      for (const entryId of entryIds) {
        for (const item of Object.values(outputChunks)) {
          if (item.name !== entryId) continue
          if (!item.code.trim()) continue
          if (!entryId) continue

          const patternIndex = entryId.match(/(\d+)(?!.*\d)/)?.[0] || "1"
          const newFileName = item.fileName
          entryChanges[patternIndex] = newFileName

          let importedCssFiles = item.viteMetadata?.importedCss
            ? [...item.viteMetadata?.importedCss]
            : []
          if (importedCssFiles.length > 0) {
            importedCssMap[patternIndex] = importedCssFiles
          }
          break
        }
      }

      const htmlItems = Object.values(outputAssets).filter((item) => {
        return item.fileName.endsWith(".html")
      })

      for (const item of htmlItems) {
        if (!Object.hasOwn(pagePatternMap, item.fileName)) continue

        const htmlName = item.fileName
        let newHtml = String(item.source)

        snippetList.forEach((snippet, index) => {
          const snippetIndex = index + 1
          newHtml = newHtml.replaceAll(snippet, `${snippetIndex}`)
        })

        const pagePattern = pagePatternMap[item.fileName]
        const assetName = entryChanges[pagePattern]
        const importedCssFiles = importedCssMap[pagePattern] ?? []

        importedCssFiles.forEach((cssFile) => {
          const basedAssetUrl = getBasedAssetUrl(base, htmlName, cssFile)
          const linkTag = `<link rel="stylesheet" href="${basedAssetUrl}">`
          newHtml = newHtml.replace("</head>", `${linkTag}</head>`)
        })
        const basedAssetUrl = getBasedAssetUrl(base, htmlName, assetName)
        const scriptTag = `<script type="module" src="${basedAssetUrl}"></script>`
        newHtml = newHtml.replace("</head>", `${scriptTag}</head>`)

        item.source = newHtml
      }
    },
    async writeBundle(options, bundle) {
      if (isBuild) return

      snippetList = [...uniqueSnippets]

      if (snippetList.length === 0) return

      const code = `export const ssrSnippetList = ${JSON.stringify(
        snippetList.map((snippet) => snippet),
      )}`
      await fs.promises.writeFile(snippetsFile, code, "utf8")
    },
  }
}
