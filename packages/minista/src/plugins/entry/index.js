/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types.js').PluginOptions} PluginOptions */
/** @typedef {import('./types.js').UserPluginOptions} UserPluginOptions */
/** @typedef {import('../ssg/types.js').SsgPage} SsgPage */

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "url"
import { glob } from "tinyglobby"
import { normalizePath } from "vite"

import { NodeHtmlDocumentFactory } from "../../adapters/html/index.js"
import { getViteBuildSession } from "../../adapters/vite/build-session.js"
import { createNodeId } from "../../core/graph/index.js"
import {
  collectEntryReferences,
  composeEntryDocument,
} from "../../features/entry/index.js"
import { createRenderedPagesArtifactId } from "../../features/ssg/index.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { getBuildBase, getBasedAssetUrl } from "../../shared/url.js"
import { regScript } from "../../shared/reg.js"
import { filterOutputChunks, filterOutputAssets } from "../../shared/vite.js"
import { createAssetEntryId } from "../../shared/asset.js"

/** @type {PluginOptions} */
export const defaultOptions = {}
const documents = new NodeHtmlDocumentFactory()

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginEntry(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = { ...defaultOptions, ...uOpts }
  const cwd = process.cwd()

  let isDev = false
  let isSsr = false
  let isBuild = false

  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let ssgDir = ""
  /** @type {SsgPage[]} */
  let ssgPages = []
  /** @type {{[pathId: string]: string}} */
  let entries = {}
  /** @type {Set<string>} */
  let entryIds = new Set()
  /** @type {{[entryId: string]: string}} */
  let entrySources = {}
  return {
    name: "vite-plugin:minista-entry",
    api: { minista: { feature: { id: "entry", apiVersion: 1, options: opts, provides: ["asset-entries"], requires: ["html-documents"] } } },
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isBuild
    },
    config: async (config) => {
      base = getBuildBase(config.base || base)
      rootDir = getRootDir(cwd, config.root || "")
      tempDir = getTempDir(cwd, rootDir)
      ssgDir = path.resolve(tempDir, "ssg")

      const session = getViteBuildSession(config)
      const renderedPages = session
        ? await session.artifacts.get(createRenderedPagesArtifactId())
        : undefined
      if (renderedPages) {
        ssgPages = JSON.parse(String(renderedPages.content))
      } else {
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
      }

      /** @type {string[]} */
      let assetNames = []
      /** @type {{ [pathId: string]: string }} */
      let preEntries = {}

      for (const ssgPage of ssgPages) {
        const document = documents.parse({
          pageId: createNodeId("page", "legacy-entry-analysis", ssgPage.fileName),
          html: ssgPage.html,
        })
        assetNames.push(
          ...collectEntryReferences(document).map(({ source }) => source),
        )
      }
      assetNames = [...new Set(assetNames)]

      for (const assetName of assetNames) {
        const pathId = regScript.test(assetName)
          ? path.parse(assetName).name
          : createAssetEntryId(assetName, entryIds)
        const fullPath = path.resolve(rootDir, assetName)
        preEntries[pathId] = fullPath
        entrySources[pathId] = assetName
      }

      const checks = await Promise.all(
        Object.entries(preEntries).map(async ([key, value]) => {
          try {
            await fs.promises.access(value)
            return [key, value]
          } catch {
            return null
          }
        }),
      )
      for (const pair of checks) {
        if (pair) entries[pair[0]] = pair[1]
      }

      return {
        build: {
          rolldownOptions: {
            input: {
              ...entries,
            },
          },
        },
      }
    },
    generateBundle(options, bundle) {
      const outputChunks = filterOutputChunks(bundle)
      const outputAssets = filterOutputAssets(bundle)
      const entryIds = Object.keys(entries)

      if (entryIds.length === 0) return

      /** @type {Map<string, import("../../features/entry/index.js").EntryBundleOutput>} */
      const bundleOutputs = new Map()

      for (const entryId of entryIds) {
        for (const item of Object.values(outputChunks)) {
          if (item.name !== entryId) continue
          if (!item.code.trim()) continue
          if (!item.facadeModuleId) continue

          const before = normalizePath(path.relative(rootDir, item.facadeModuleId))
          const importedCssFiles = item.viteMetadata?.importedCss
            ? [...item.viteMetadata?.importedCss]
            : []
          bundleOutputs.set(before, {
            source: before,
            fileName: item.fileName,
            cssFiles: importedCssFiles,
          })
          break
        }

        for (const item of Object.values(outputAssets)) {
          const source = entrySources[entryId]
          const fullPath = entries[entryId]
          if (
            !item.originalFileNames.some((name) =>
              [entryId, source, fullPath].includes(name),
            )
          ) continue
          bundleOutputs.set(source, {
            source,
            fileName: item.fileName,
            cssFiles: [],
          })
          break
        }
      }

      const htmlItems = Object.values(outputAssets).filter((item) => {
        return item.fileName.endsWith(".html")
      })

      for (const item of htmlItems) {
        const document = documents.parse({
          pageId: createNodeId("page", "legacy-entry-compose", item.fileName),
          html: String(item.source),
        })
        composeEntryDocument(document, [...bundleOutputs.values()], {
          resolve: (fileName) =>
            getBasedAssetUrl(base, item.fileName, fileName),
        })
        item.source = document.serialize()
      }
    },
  }
}
