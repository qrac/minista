/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types.js').PluginOptions} PluginOptions */
/** @typedef {import('./types.js').UserPluginOptions} UserPluginOptions */
/** @typedef {import('../ssg/types.js').SsgPage} SsgPage */
/** @typedef {import('../../adapters/vite/environment-preparation.js').ViteEnvironmentPreparation} ViteEnvironmentPreparation */

import fs from "node:fs"
import path from "node:path"
import { normalizePath } from "vite"

import { NodeHtmlDocumentFactory } from "../../adapters/html/index.js"
import { getViteBuildSession } from "../../adapters/vite/build-session.js"
import { NodeExternalBuildHandoff } from "../../adapters/filesystem/external-build-handoff.js"
import { getViteAppEnvironmentNames } from "../../adapters/vite/app-config.js"
import { ViteEnvironmentInputAdapter } from "../../adapters/vite/environment-input.js"
import { createNodeId } from "../../core/graph/index.js"
import {
  collectEntryReferences,
  composeEntryDocument,
} from "../../features/entry/index.js"
import { createRenderedPagesArtifactId } from "../../features/ssg/index.js"
import { getRootDir } from "../../shared/path.js"
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
  let isAppBuild = false
  /** @type {Required<import("../../adapters/vite/app-config.js").ViteAppEnvironmentNames> | undefined} */
  let appEnvironmentNames

  let base = "/"
  let rootDir = ""
  /** @type {SsgPage[]} */
  let ssgPages = []
  /** @type {{[pathId: string]: string}} */
  let entries = {}
  /** @type {Set<string>} */
  let entryIds = new Set()
  /** @type {{[entryId: string]: string}} */
  let entrySources = {}
  /** @type {Map<string, Set<string>>} */
  let entryPageUrls = new Map()
  /** @type {import("../../core/graph/index.js").OutputClaim[]} */
  let outputClaims = []
  /** @type {import("../../adapters/vite/build-session.js").ViteBuildSession | undefined} */
  let buildSession
  const externalBuildId = process.env.MINISTA_EXTERNAL_BUILD_ID
  const environmentInput = new ViteEnvironmentInputAdapter()

  async function prepareEntries() {
    entries = {}
    entryIds = new Set()
    entrySources = {}
    entryPageUrls = new Map()
    outputClaims = []
    const renderedPages = buildSession
      ? await buildSession.artifacts.get(createRenderedPagesArtifactId())
      : undefined
    if (renderedPages) {
      ssgPages = JSON.parse(String(renderedPages.content))
    } else if (externalBuildId) {
      ssgPages = [...(
        await new NodeExternalBuildHandoff().readRenderedPages(
          rootDir,
          externalBuildId,
        ) ?? []
      )]
    } else {
      return
    }

    /** @type {string[]} */
    let assetNames = []
    /** @type {{ [pathId: string]: string }} */
    const preEntries = {}

    for (const ssgPage of ssgPages) {
      const document = documents.parse({
        pageId: createNodeId("page", "legacy-entry-analysis", ssgPage.fileName),
        html: ssgPage.html,
      })
      const references = collectEntryReferences(document)
      assetNames.push(...references.map(({ source }) => source))
      for (const { source } of references) {
        const urls = entryPageUrls.get(source) ?? new Set()
        urls.add(ssgPage.url)
        entryPageUrls.set(source, urls)
      }
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
  }

  /** @param {ViteEnvironmentPreparation} preparation */
  async function prepareAppClient(preparation) {
    if (!isAppBuild) return
    await prepareEntries()
    environmentInput.merge(preparation.client, entries)
  }

  return {
    name: "vite-plugin:minista-entry",
    api: { minista: { prepareClient: prepareAppClient, outputClaims: () => outputClaims, feature: { id: "entry", apiVersion: 1, options: opts, provides: ["asset-entries"], requires: ["html-documents"] } } },
    enforce: "pre",
    apply(config, { command, isSsrBuild }) {
      isDev = command === "serve"
      appEnvironmentNames = getViteAppEnvironmentNames(config)
      isAppBuild = command === "build" && Boolean(appEnvironmentNames)
      isSsr = command === "build" && !isAppBuild && Boolean(isSsrBuild)
      isBuild = command === "build" && !isAppBuild && !isSsrBuild
      return isBuild || isAppBuild
    },
    applyToEnvironment(environment) {
      return !isAppBuild || environment.name === appEnvironmentNames?.clientName
    },
    config: async (config) => {
      base = getBuildBase(config.base || base)
      rootDir = getRootDir(cwd, config.root || "")
      buildSession = getViteBuildSession(config)
      if (isAppBuild) return

      await prepareEntries()

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

      /** @type {Map<string, {sources: Set<string>, pageUrls: Set<string>}>} */
      const cssClaims = new Map()
      outputClaims = [...bundleOutputs.values()].map((output) => {
        const extension = path.extname(output.fileName)
        const pageUrls = entryPageUrls.get(output.source) ??
          entryPageUrls.get(`/${output.source}`) ??
          entryPageUrls.get(output.source.replace(/^\/+/, "")) ??
          new Set()
        for (const fileName of output.cssFiles) {
          const cssClaim = cssClaims.get(fileName) ?? {
            sources: new Set(),
            pageUrls: new Set(),
          }
          cssClaim.sources.add(output.source)
          for (const pageUrl of pageUrls) cssClaim.pageUrls.add(pageUrl)
          cssClaims.set(fileName, cssClaim)
        }
        return Object.freeze({
          id: createNodeId("artifact", "entry-output", output.source),
          kind: /** @type {"script"|"style"|"data"} */ (
            extension === ".js"
              ? "script"
              : extension === ".css"
                ? "style"
                : "data"
          ),
          owner: createNodeId("feature", "entry"),
          source: output.source,
          fileName: output.fileName,
          pageUrls: Object.freeze([...pageUrls]),
          dependencies: Object.freeze([]),
        })
      })
      outputClaims.push(...[...cssClaims].map(([fileName, claim]) => {
        const sources = [...claim.sources].sort()
        return Object.freeze({
          id: createNodeId("artifact", "entry-style-output", fileName),
          kind: /** @type {const} */ ("style"),
          owner: createNodeId("feature", "entry"),
          source: sources.join(","),
          fileName,
          pageUrls: Object.freeze([...claim.pageUrls]),
          dependencies: Object.freeze([]),
        })
      }))

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
