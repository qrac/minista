/** @typedef {import('rolldown-vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "url"
import { glob } from "tinyglobby"
import { normalizePath } from "vite"

import { transformDirectives } from "./utils/directive.js"
import { decodeSnippet } from "./utils/snippet.js"
import { getIslandBuildCode } from "./utils/code.js"
import { getPluginName, getTempName } from "../../shared/name.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { getBuildBase, getBasedAssetUrl } from "../../shared/url.js"
import { filterOutputChunks, filterOutputAssets } from "../../shared/vite.js"

/**
 * @param {PluginOptions} opts
 * @returns {Plugin}
 */
export function pluginIslandBuild(opts) {
  const cwd = process.cwd()
  const names = ["island", "build"]
  const pluginName = getPluginName(names)
  const tempName = getTempName(names)

  let isSsr = false
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
    name: pluginName,
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = !!config.build?.ssr
      base = getBuildBase(config.base || base)
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      islandDir = path.resolve(tempDir, "island/build")
      snippetsDir = path.resolve(tempDir, "island/build/snippets")
      snippetsFile = path.resolve(islandDir, `${tempName}_snippets.mjs`)
      ssgDir = path.resolve(tempDir, "ssg")

      await fs.promises.mkdir(islandDir, { recursive: true })
      await fs.promises.mkdir(snippetsDir, { recursive: true })

      if (isSsr) return

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
          })
        )
      ).flat()

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
            html.includes(snippet)
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

      for (const [page, pattren] of Object.entries(pagePatternMap)) {
        const patternIndex = patternIndexMap[pattren]
        pagePatternMap[page] = String(patternIndex)
      }

      await Promise.all(
        snippetList.map(async (snippet, index) => {
          const snippetIndex = index + 1
          const fileName = `snippet-${snippetIndex}.tsx`
          const fullPath = path.resolve(snippetsDir, fileName)
          const code = decodeSnippet(snippet)
          await fs.promises.writeFile(fullPath, code, "utf8")
        })
      )
      await Promise.all(
        Object.entries(patternIndexMap).map(async ([patternId, index]) => {
          const fileName = `${opts.outName}.tsx`.replace(
            /\[index\]/g,
            String(index)
          )
          const fullPath = path.resolve(islandDir, fileName)
          const pattern = patternId.split(",").map((i) => Number(i))
          const code = getIslandBuildCode(pattern, opts)
          await fs.promises.writeFile(fullPath, code, "utf8")
          const pathId = path.parse(fileName).name
          entries[pathId] = fullPath
        })
      )
      return {
        build: {
          rollupOptions: {
            input: entries,
          },
        },
      }
    },
    async transform(code, id) {
      if (!isSsr) return null
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

          const before = normalizePath(
            path.relative(rootDir, item.facadeModuleId)
          )
          const patternIndex = entryId.match(/(\d+)(?!.*\d)/)[0] || "1"
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
      if (!isSsr) return

      snippetList = [...uniqueSnippets]

      if (snippetList.length === 0) return

      const code = `export const ssrSnippetList = ${JSON.stringify(
        snippetList.map((snippet) => snippet)
      )}`
      await fs.promises.writeFile(snippetsFile, code, "utf8")
    },
  }
}
