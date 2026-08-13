/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types.js').PluginOptions} PluginOptions */
/** @typedef {import('./types.js').UserPluginOptions} UserPluginOptions */
/** @typedef {import('../../features/ssg/index.js').RenderedPage} RenderedPage */
/** @typedef {import('../../adapters/vite/environment-preparation.js').ViteEnvironmentPreparation} ViteEnvironmentPreparation */

import fs from "node:fs"
import path from "node:path"
import { normalizePath } from "vite"

import { getViteBuildSession } from "../../adapters/vite/build-session.js"
import { ViteBuildDataReader } from "../../adapters/vite/build-data-reader.js"
import {
  getViteAppEnvironmentNames,
  isViteAppClientEnvironment,
} from "../../adapters/vite/app-config.js"
import {
  createViteCompatibilityTraceHooks,
  processViteDocuments,
} from "../../adapters/vite/compatibility-lifecycle.js"
import { ViteEnvironmentInputAdapter } from "../../adapters/vite/environment-input.js"
import { ViteEnvironmentState } from "../../adapters/vite/environment-state.js"
import { createNodeId } from "../../core/graph/index.js"
import { createEntryFeature } from "../../features/entry/index.js"
import { getRootDir } from "../../shared/path.js"
import { getHtmlPageUrl } from "../../shared/filename.js"
import { getBuildBase, getBasedAssetUrl } from "../../shared/url.js"
import { regScript } from "../../shared/reg.js"
import { filterOutputChunks, filterOutputAssets } from "../../shared/vite.js"
import { createAssetEntryId } from "../../shared/asset.js"

/** @type {PluginOptions} */
export const defaultOptions = {}

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginEntry(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = { ...defaultOptions, ...uOpts }
  const cwd = process.cwd()

  const createEntryState = () => ({
    entries: /** @type {{[pathId: string]: string}} */ ({}),
    entryIds: /** @type {Set<string>} */ (new Set()),
    entrySources: /** @type {{[entryId: string]: string}} */ ({}),
    entryPageUrls: /** @type {Map<string, Set<string>>} */ (new Map()),
  })
  const entryStates = new ViteEnvironmentState(createEntryState)
  const legacyState = createEntryState()
  const claimStates = new ViteEnvironmentState(() => ({
    claims: /** @type {import("../../core/graph/index.js").OutputClaim[]} */ ([]),
  }))
  const externalBuildId = process.env.MINISTA_EXTERNAL_BUILD_ID
  const environmentInput = new ViteEnvironmentInputAdapter()

  /**
   * @param {ReturnType<typeof createEntryState>} state
   * @param {string} rootDir
   * @param {import("../../adapters/vite/build-session.js").ViteBuildSession | undefined} buildSession
   */
  async function prepareEntries(state, rootDir, buildSession) {
    state.entries = {}
    state.entryIds = new Set()
    state.entrySources = {}
    state.entryPageUrls = new Map()
    const ssgPages = await new ViteBuildDataReader({
      root: rootDir,
      session: buildSession,
      externalBuildId,
    }).readRenderedPages()

    const analysis = await processViteDocuments(
      ssgPages.map(({ fileName, url, html }) => ({ fileName, url, html })),
      [createEntryFeature(
        opts,
        { bundle: async () => [] },
        { resolve: () => undefined },
      )],
      ["analyze"],
      createViteCompatibilityTraceHooks(buildSession, "entry:prepare"),
    )
    /** @type {import("../../features/entry/index.js").EntryReference[]} */
    const references = analysis.artifacts
      .filter((record) =>
        record.mediaType === "application/vnd.minista.entry-references+json"
      )
      .flatMap((record) => JSON.parse(String(record.content)))
    const pageUrls = new Map(
      [...analysis.graph.pages.values()].map(({ id, url }) => [id, url]),
    )
    /** @type {string[]} */
    let assetNames = references.map(({ source }) => source)
    /** @type {{ [pathId: string]: string }} */
    const preEntries = {}

    for (const { pageId, source } of references) {
      const url = pageUrls.get(pageId)
      if (!url) continue
      const urls = state.entryPageUrls.get(source) ?? new Set()
      urls.add(url)
      state.entryPageUrls.set(source, urls)
    }
    assetNames = [...new Set(assetNames)]

    for (const assetName of assetNames) {
      const pathId = regScript.test(assetName)
        ? path.parse(assetName).name
        : createAssetEntryId(assetName, state.entryIds)
      const fullPath = path.resolve(rootDir, assetName)
      preEntries[pathId] = fullPath
      state.entrySources[pathId] = assetName
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
      if (pair) state.entries[pair[0]] = pair[1]
    }
  }

  /** @param {ViteEnvironmentPreparation} preparation */
  async function prepareAppClient(preparation) {
    const topLevelConfig = preparation.client.getTopLevelConfig()
    if (!getViteAppEnvironmentNames(topLevelConfig)) return
    claimStates.delete(preparation.client)
    const state = entryStates.get(preparation.client)
    const rootDir = getRootDir(cwd, preparation.client.config.root || "")
    await prepareEntries(
      state,
      rootDir,
      getViteBuildSession(topLevelConfig),
    )
    environmentInput.merge(preparation.client, state.entries)
  }

  return {
    name: "vite-plugin:minista-entry",
    api: { minista: { prepareClient: prepareAppClient, outputClaims: /** @param {import("vite").Environment | undefined} environment */ (environment) => claimStates.get(environment).claims, feature: { id: "entry", apiVersion: 1, options: opts, provides: ["asset-entries"], requires: ["html-documents"] } } },
    enforce: "pre",
    apply(config, { command, isSsrBuild }) {
      const isAppBuild = command === "build" &&
        Boolean(getViteAppEnvironmentNames(config))
      const isLegacyBuild = command === "build" && !isAppBuild && !isSsrBuild
      return isLegacyBuild || isAppBuild
    },
    applyToEnvironment: isViteAppClientEnvironment,
    config: async (config) => {
      if (getViteAppEnvironmentNames(config)) return

      const rootDir = getRootDir(cwd, config.root || "")
      await prepareEntries(
        legacyState,
        rootDir,
        getViteBuildSession(config),
      )

      return {
        build: {
          rolldownOptions: {
            input: {
              ...legacyState.entries,
            },
          },
        },
      }
    },
    async generateBundle(options, bundle) {
      const appEnvironmentNames = getViteAppEnvironmentNames(
        this.environment.getTopLevelConfig(),
      )
      const state = appEnvironmentNames
        ? entryStates.get(this.environment)
        : legacyState
      const { entries, entrySources, entryPageUrls } = state
      const rootDir = getRootDir(cwd, this.environment.config.root || "")
      const base = getBuildBase(this.environment.config.base || "/")
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
      const outputClaims = claimStates.get(this.environment).claims
      outputClaims.length = 0
      outputClaims.push(...[...bundleOutputs.values()].map((output) => {
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
      }))
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

      const pages = htmlItems.map((item) => ({
        item,
        fileName: item.fileName,
        url: getHtmlPageUrl(item.fileName),
        html: String(item.source),
      }))
      const pageFileNames = new Map()
      const buildSession = getViteBuildSession(
        this.environment.getTopLevelConfig(),
      )
      const result = await processViteDocuments(
        pages.map(({ fileName, url, html }) => ({ fileName, url, html })),
        [createEntryFeature(
          opts,
          { bundle: async () => [...bundleOutputs.values()] },
          {
            resolve(fileName, pageId) {
              const pageFileName = pageFileNames.get(pageId)
              return pageFileName
                ? getBasedAssetUrl(base, pageFileName, fileName)
                : undefined
            },
          },
        )],
        ["analyze", "bundle", "compose"],
        createViteCompatibilityTraceHooks(buildSession, "entry:bundle", {
          beforeCompose({ graph }) {
            for (const page of graph.pages.values()) {
              const route = graph.routes.get(page.routeId)
              if (route) pageFileNames.set(page.id, route.pageModuleId)
            }
          },
        }),
      )
      const outputDocuments = new Map(
        result.documents.map((document) => [document.fileName, document]),
      )
      for (const page of pages) {
        const output = outputDocuments.get(page.fileName)
        if (output && output.html !== page.html) page.item.source = output.html
      }
    },
  }
}
