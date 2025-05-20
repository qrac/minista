/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { glob } from "tinyglobby"

import { transformDirectives } from "./utils/directive.js"
import { decodeSnippet } from "./utils/snippet.js"
import { getIslandBuildCode } from "./utils/code.js"
import { getPluginName, getTempName } from "../../shared/name.js"
import { getRootDir, getTempDir, pathToId } from "../../shared/path.js"
import { getBasedAssetUrl } from "../../shared/url.js"
import { filterOutputAssets, filterOutputChunks } from "../../shared/vite.js"

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
      base = config.base || base
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      islandDir = path.resolve(tempDir, "island/build")
      snippetsDir = path.resolve(tempDir, "island/build/snippets")
      snippetsFile = path.resolve(islandDir, `${tempName}_snippets.mjs`)
      ssgDir = path.resolve(tempDir, "ssg")

      await fs.promises.mkdir(islandDir, { recursive: true })
      await fs.promises.mkdir(snippetsDir, { recursive: true })

      if (isSsr) return

      /** @type {{ssrSnippetList: string[]}} */
      const { ssrSnippetList } = await import(snippetsFile)

      snippetList = ssrSnippetList

      if (!snippetList || snippetList.length === 0) return

      const ssgFiles = await glob(path.resolve(ssgDir, `*.mjs`))

      if (!ssgFiles.length) return

      ssgPages = (
        await Promise.all(
          ssgFiles.map(async (file) => {
            const { ssgPages } = await import(path.resolve(cwd, file))
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
          const reactImportLine = `import React from "react"`
          const code = reactImportLine + "\n" + decodeSnippet(snippet)
          await fs.promises.writeFile(fullPath, code, "utf8")
        })
      )
      await Promise.all(
        Object.entries(patternIndexMap).map(async ([patternId, index]) => {
          const fileName = `${tempName}${index}.tsx`
          const fullPath = path.resolve(islandDir, fileName)
          const pattern = patternId.split(",").map((i) => Number(i))
          const code = getIslandBuildCode(pattern, opts)
          await fs.promises.writeFile(fullPath, code, "utf8")
          const pathId = pathToId(fullPath)
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

      const outputAssets = filterOutputAssets(bundle)
      const outputChunks = filterOutputChunks(bundle)
      const entryIds = Object.keys(entries)

      if (entryIds.length === 0) return

      for (const item of Object.values(outputAssets)) {
        for (const entryId of entryIds) {
          if (
            item.names.some((name) => name.replace(/\.css$/, "") === entryId)
          ) {
            const name = path.parse(entries[entryId]).name
            const nameIndex = name.match(/\d+$/)[0]
            const newFileName = item.fileName
              .replace(entryId, opts.outName)
              .replace(/\[index\]/g, nameIndex)
            item.fileName = newFileName
          }
        }
      }

      for (const item of Object.values(outputChunks)) {
        if (entryIds.includes(item.name) && item.code.trim()) {
          const name = path.parse(entries[item.name]).name
          const nameIndex = name.match(/\d+$/)[0]
          const newFileName = item.fileName
            .replace(item.name, opts.outName)
            .replace(/\[index\]/g, nameIndex)
          item.fileName = newFileName
          entryChanges[nameIndex] = newFileName

          let importedCssFiles = item.viteMetadata?.importedCss
            ? [...item.viteMetadata?.importedCss]
            : []
          importedCssFiles = importedCssFiles
            .map((module) => bundle[module]?.fileName)
            .filter(Boolean)
          importedCssMap[nameIndex] = importedCssFiles
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
