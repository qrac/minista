/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('../../features/ssg/index.js').RenderedPage} RenderedPage */
/** @typedef {import('../../adapters/vite/environment-preparation.js').ViteEnvironmentPreparation} ViteEnvironmentPreparation */

import fs from "node:fs"
import path from "node:path"
import { normalizePath } from "vite"

import {
  NodeIslandEntryGenerator,
  SwcIslandSourceTransformer,
} from "../../adapters/island/index.js"
import { getViteBuildSession } from "../../adapters/vite/build-session.js"
import { ViteBuildDataReader } from "../../adapters/vite/build-data-reader.js"
import { NodeExternalBuildHandoff } from "../../adapters/filesystem/external-build-handoff.js"
import { ViteDevModuleEvaluator } from "../../adapters/vite/dev-module-evaluator.js"
import { getViteAppEnvironmentNames } from "../../adapters/vite/app-config.js"
import { processViteDocuments } from "../../adapters/vite/compatibility-lifecycle.js"
import { ViteEnvironmentInputAdapter } from "../../adapters/vite/environment-input.js"
import { createNodeId } from "../../core/graph/index.js"
import {
  createIslandFeature,
  createIslandSnippetsArtifactId,
  createIslandSourcePlanArtifactId,
} from "../../features/island/index.js"
import { decodeSnippet } from "./utils/snippet.js"
import { getIslandServeCode } from "./utils/code.js"
import { getHtmlPageUrl } from "../../shared/filename.js"
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
const entryGenerator = new NodeIslandEntryGenerator()
const sourceTransformer = new SwcIslandSourceTransformer()

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
  let isAppBuild = false
  /** @type {Required<import("../../adapters/vite/app-config.js").ViteAppEnvironmentNames> | undefined} */
  let appEnvironmentNames

  let base = "/"
  let rootDir = ""
  let tempDir = ""
  let islandDir = ""
  let snippetsDir = ""
  /** @type {string[]} */
  let snippetList = []
  /** @type {Set<string>} */
  let uniqueSnippets = new Set()
  /** @type {ViteDevModuleEvaluator | undefined} */
  let moduleEvaluator
  /** @type {readonly RenderedPage[]} */
  let ssgPages = []
  /** @type {{[pathId: string]: string}} */
  let entries = {}
  /** @type {import("../../features/island/index.js").IslandSourcePlan | undefined} */
  let sourcePlan
  /** @type {import("../../core/graph/index.js").OutputClaim[]} */
  let outputClaims = []
  /** @type {import("../../adapters/vite/build-session.js").ViteBuildSession | undefined} */
  let buildSession
  const externalBuildId = process.env.MINISTA_EXTERNAL_BUILD_ID
  const environmentInput = new ViteEnvironmentInputAdapter()

  async function prepareIslandEntries() {
    entries = {}
    sourcePlan = undefined
    outputClaims = []
    const dataReader = new ViteBuildDataReader({
      root: rootDir,
      session: buildSession,
      externalBuildId,
    })
    snippetList = [...await dataReader.readIslandSnippets()]
    if (!snippetList || snippetList.length === 0) return

    ssgPages = await dataReader.readRenderedPages()

    if (!ssgPages.length) return
    const feature = createIslandFeature(
      opts,
      entryGenerator,
      { bundle: async () => [] },
      { resolve: () => undefined },
    )
    const result = await processViteDocuments(
      ssgPages.map(({ fileName, url, html }) => ({ fileName, url, html })),
      [feature],
      ["analyze", "generate"],
      {
        inputArtifacts: [{
          schemaVersion: "1",
          id: createIslandSnippetsArtifactId(),
          owner: feature.id,
          mediaType: "application/vnd.minista.island-snippets+json",
          content: JSON.stringify(snippetList),
        }],
      },
    )
    const sourceRecord = result.artifacts.find(
      ({ id }) => id === createIslandSourcePlanArtifactId(),
    )
    if (!sourceRecord) return
    /** @type {import("../../features/island/index.js").IslandSourcePlan} */
    const activeSourcePlan = JSON.parse(String(sourceRecord.content))
    sourcePlan = activeSourcePlan
    await Promise.all(
      activeSourcePlan.snippets.map(async (snippet) => {
        const fullPath = path.resolve(
          snippetsDir,
          `snippet-${snippet.index}.tsx`,
        )
        await fs.promises.writeFile(fullPath, snippet.code, "utf8")
      }),
    )
    await Promise.all(
      activeSourcePlan.entries.map(async (entry) => {
        const fileName = `${entry.fileName}.tsx`
        const fullPath = path.resolve(islandDir, fileName)
        await fs.promises.writeFile(fullPath, entry.code, "utf8")
        entries[path.parse(fileName).name] = fullPath
      }),
    )
  }

  /** @param {ViteEnvironmentPreparation} preparation */
  async function prepareAppClient(preparation) {
    if (!isAppBuild) return
    await prepareIslandEntries()
    environmentInput.merge(preparation.client, entries)
  }

  return {
    name: "vite-plugin:minista-island",
    api: {
      minista: {
        prepareClient: prepareAppClient,
        outputClaims: () => outputClaims,
        feature: {
          id: "island",
          apiVersion: 1,
          options: opts,
          provides: ["island-entries"],
          requires: ["html-documents"],
        },
      },
    },
    enforce: "pre",
    apply(config, { command, isSsrBuild }) {
      isDev = command === "serve"
      appEnvironmentNames = getViteAppEnvironmentNames(config)
      isAppBuild = command === "build" && Boolean(appEnvironmentNames)
      isSsr = command === "build" && !isAppBuild && Boolean(isSsrBuild)
      isBuild = command === "build" && !isAppBuild && !isSsrBuild
      return isDev || isAppBuild || isSsr || isBuild
    },
    config: async (config) => {
      buildSession = getViteBuildSession(config)
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
      if (isSsr || isBuild || isAppBuild) {
        base = getBuildBase(config.base || base)
        islandDir = path.resolve(tempDir, "island/build")
        snippetsDir = path.resolve(tempDir, "island/build/snippets")

        await fs.promises.mkdir(islandDir, { recursive: true })
        await fs.promises.mkdir(snippetsDir, { recursive: true })

        if (isSsr || isAppBuild) return
        await prepareIslandEntries()

        return {
          build: {
            rolldownOptions: {
              input: entries,
            },
          },
        }
      }
    },
    configureServer(server) {
      return () => {
        moduleEvaluator = new ViteDevModuleEvaluator(server)
      }
    },
    async transformIndexHtml(html) {
      if (moduleEvaluator) {
        /** @type {{default?: RenderedPage[]}} */
        const mod = await moduleEvaluator.importModule("virtual:ssg-pages")
        ssgPages = mod.default ?? []

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
        const { code: transformdCode, snippets } = sourceTransformer.transform(
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
    async generateBundle(_options, bundle) {
      if (isSsr || this.environment.name === appEnvironmentNames?.renderName) {
        return
      }
      outputClaims = []

      const outputChunks = filterOutputChunks(bundle)
      const outputAssets = filterOutputAssets(bundle)
      const entryIds = Object.keys(entries)

      if (entryIds.length === 0 || !sourcePlan) return
      const activeSourcePlan = sourcePlan

      /** @type {import("../../features/island/index.js").IslandBundleOutput[]} */
      const bundleOutputs = []

      for (const entryId of entryIds) {
        for (const item of Object.values(outputChunks)) {
          if (item.name !== entryId) continue
          if (!item.code.trim()) continue
          if (!entryId) continue

          const patternIndex = entryId.match(/(\d+)(?!.*\d)/)?.[0] || "1"
          const newFileName = item.fileName
          const importedCssFiles = item.viteMetadata?.importedCss
            ? [...item.viteMetadata?.importedCss]
            : []
          bundleOutputs.push({
            patternIndex: Number(patternIndex),
            fileName: newFileName,
            cssFiles: importedCssFiles,
          })
          break
        }
      }

      const htmlItems = Object.values(outputAssets).filter((item) => {
        return item.fileName.endsWith(".html")
      })
      const pages = htmlItems.map((item) => ({
        item,
        fileName: item.fileName,
        url: getHtmlPageUrl(item.fileName),
        html: String(item.source),
      }))
      const pageFileNames = new Map()
      const feature = createIslandFeature(
        opts,
        entryGenerator,
        { bundle: async () => bundleOutputs },
        {
          resolve(fileName, pageId) {
            const pageFileName = pageFileNames.get(pageId)
            return pageFileName
              ? getBasedAssetUrl(base, pageFileName, fileName)
              : undefined
          },
        },
      )
      const result = await processViteDocuments(
        pages.map(({ fileName, url, html }) => ({ fileName, url, html })),
        [feature],
        ["bundle", "compose"],
        {
          inputArtifacts: [{
            schemaVersion: "1",
            id: createIslandSourcePlanArtifactId(),
            owner: feature.id,
            mediaType: "application/vnd.minista.island-sources+json",
            content: JSON.stringify(activeSourcePlan),
          }],
          beforeCompose({ graph }) {
            for (const page of graph.pages.values()) {
              const route = graph.routes.get(page.routeId)
              if (route) pageFileNames.set(page.id, route.pageModuleId)
            }
          },
        },
      )
      const pageUrlsByPattern = new Map()
      for (const page of result.graph.pages.values()) {
        const patternIndex = activeSourcePlan.pagePatterns[page.id]
        if (!patternIndex) continue
        const urls = pageUrlsByPattern.get(patternIndex) ?? []
        urls.push(page.url)
        pageUrlsByPattern.set(patternIndex, urls)
      }
      /** @type {Map<string, Set<string>>} */
      const cssPageUrls = new Map()
      for (const output of bundleOutputs) {
        const pageUrls = pageUrlsByPattern.get(output.patternIndex) ?? []
        outputClaims.push(Object.freeze({
          id: createNodeId(
            "artifact",
            "island-output",
            String(output.patternIndex),
          ),
          kind: "script",
          owner: createNodeId("feature", "island"),
          source: `pattern:${output.patternIndex}`,
          fileName: output.fileName,
          pageUrls: Object.freeze(pageUrls),
          dependencies: Object.freeze([]),
        }))
        for (const fileName of output.cssFiles) {
          const consumers = cssPageUrls.get(fileName) ?? new Set()
          for (const pageUrl of pageUrls) consumers.add(pageUrl)
          cssPageUrls.set(fileName, consumers)
        }
      }
      outputClaims.push(...[...cssPageUrls].map(([fileName, pageUrls]) =>
        Object.freeze({
          id: createNodeId("artifact", "island-style-output", fileName),
          kind: /** @type {const} */ ("style"),
          owner: createNodeId("feature", "island"),
          source: "island-style",
          fileName,
          pageUrls: Object.freeze([...pageUrls]),
          dependencies: Object.freeze([]),
        })
      ))

      const outputDocuments = new Map(
        result.documents.map((document) => [document.fileName, document]),
      )
      for (const page of pages) {
        const output = outputDocuments.get(page.fileName)
        if (output && output.html !== page.html) page.item.source = output.html
      }
    },
    async writeBundle() {
      if (isBuild) return
      if (
        isAppBuild &&
        this.environment.name !== appEnvironmentNames?.renderName
      ) {
        return
      }

      snippetList = [...uniqueSnippets]

      if (snippetList.length === 0) return

      if (buildSession) {
        await buildSession.artifacts.put({
          schemaVersion: "1",
          id: createIslandSnippetsArtifactId(),
          owner: createNodeId("feature", "island"),
          mediaType: "application/vnd.minista.island-snippets+json",
          content: JSON.stringify(snippetList),
        })
      }
      if (!buildSession) {
        if (!externalBuildId) return
        await new NodeExternalBuildHandoff().writeIslandSnippets(
          rootDir,
          externalBuildId,
          snippetList,
        )
      }
    },
  }
}
