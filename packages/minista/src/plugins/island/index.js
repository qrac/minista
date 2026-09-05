import { registerViteFeatureLifecycle } from "../../adapters/vite/feature-lifecycle.js"

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
  RolldownIslandSourceTransformer,
} from "../../adapters/island/index.js"
import { getViteBuildSession } from "../../adapters/vite/build-session.js"
import { ViteBuildDataReader } from "../../adapters/vite/build-data-reader.js"
import { NodeExternalBuildHandoff } from "../../adapters/filesystem/external-build-handoff.js"
import { ViteDevModuleEvaluator } from "../../adapters/vite/dev-module-evaluator.js"
import { getViteAppEnvironmentNames } from "../../adapters/vite/app-config.js"
import {
  createViteCompatibilityTraceHooks,
  processViteDocuments,
} from "../../adapters/vite/compatibility-lifecycle.js"
import { ViteDevServerRegistry } from "../../adapters/vite/dev-server-registry.js"
import { ViteEnvironmentInputAdapter } from "../../adapters/vite/environment-input.js"
import { ViteEnvironmentState } from "../../adapters/vite/environment-state.js"
import { createNodeId } from "../../core/graph/index.js"
import {
  createIslandFeature,
  createIslandSnippetsArtifactId,
  createIslandSourcePlanArtifactId,
} from "../../features/island/index.js"
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

  const createBuildState = () => ({
    uniqueSnippets: /** @type {Set<string>} */ (new Set()),
    entries: /** @type {{[pathId: string]: string}} */ ({}),
    sourcePlan: /** @type {import("../../features/island/index.js").IslandSourcePlan | undefined} */ (undefined),
  })
  const buildStates = new ViteEnvironmentState(createBuildState)
  const legacyState = createBuildState()
  const devServers = new ViteDevServerRegistry()
  const devStates = new ViteEnvironmentState(() => ({
    uniqueSnippets: /** @type {Set<string>} */ (new Set()),
    moduleEvaluator: /** @type {ViteDevModuleEvaluator | undefined} */ (undefined),
  }))
  const claimStates = new ViteEnvironmentState(() => ({
    claims: /** @type {import("../../core/graph/index.js").OutputClaim[]} */ ([]),
  }))
  const externalBuildId = process.env.MINISTA_EXTERNAL_BUILD_ID
  const environmentInput = new ViteEnvironmentInputAdapter()

  /**
   * @param {ReturnType<typeof createBuildState>} state
   * @param {string} rootDir
   * @param {string} islandDir
   * @param {string} snippetsDir
   * @param {import("../../adapters/vite/build-session.js").ViteBuildSession | undefined} buildSession
   */
  async function prepareIslandEntries(
    state,
    rootDir,
    islandDir,
    snippetsDir,
    buildSession,
  ) {
    state.entries = {}
    state.sourcePlan = undefined
    const dataReader = new ViteBuildDataReader({
      root: rootDir,
      session: buildSession,
      externalBuildId,
    })
    const snippetList = [...await dataReader.readIslandSnippets()]
    if (snippetList.length === 0) return

    const ssgPages = await dataReader.readRenderedPages()

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
      createViteCompatibilityTraceHooks(buildSession, "island:prepare", {
        inputArtifacts: [{
          schemaVersion: "1",
          id: createIslandSnippetsArtifactId(),
          owner: feature.id,
          mediaType: "application/vnd.minista.island-snippets+json",
          content: JSON.stringify(snippetList),
        }],
      }),
    )
    const sourceRecord = result.artifacts.find(
      ({ id }) => id === createIslandSourcePlanArtifactId(),
    )
    if (!sourceRecord) return
    /** @type {import("../../features/island/index.js").IslandSourcePlan} */
    const activeSourcePlan = JSON.parse(String(sourceRecord.content))
    state.sourcePlan = activeSourcePlan
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
        state.entries[path.parse(fileName).name] = fullPath
      }),
    )
  }

  /** @param {ViteEnvironmentPreparation} preparation */
  async function prepareAppClient(preparation) {
    const topLevelConfig = preparation.client.getTopLevelConfig()
    if (!getViteAppEnvironmentNames(topLevelConfig)) return
    claimStates.delete(preparation.client)
    const state = buildStates.get(preparation.client)
    const rootDir = getRootDir(cwd, preparation.client.config.root || "")
    const tempDir = getTempDir(cwd, rootDir)
    const islandDir = path.resolve(tempDir, "island/build")
    const snippetsDir = path.resolve(islandDir, "snippets")
    await prepareIslandEntries(
      state,
      rootDir,
      islandDir,
      snippetsDir,
      getViteBuildSession(topLevelConfig),
    )
    environmentInput.merge(preparation.client, state.entries)
  }

  return registerViteFeatureLifecycle({
    name: "vite-plugin:minista-island",
    api: {
      minista: {
        prepareClient: prepareAppClient,
        outputClaims: /** @param {import("vite").Environment | undefined} environment */ (environment) => claimStates.get(environment).claims,
        feature: {
          id: "island",
          apiVersion: 1,
          options: opts,
          provides: ["island-entries"],
          requires: ["html-documents"], optionalAfter: ["comment", "svg"],
        },
      },
    },
    enforce: "pre",
    apply(config, { command, isSsrBuild }) {
      const isAppBuild = command === "build" &&
        Boolean(getViteAppEnvironmentNames(config))
      const isSsr = command === "build" && !isAppBuild && Boolean(isSsrBuild)
      return command === "serve" || isAppBuild || isSsr ||
        (command === "build" && !isSsrBuild)
    },
    config: async (config, { command, isSsrBuild }) => {
      const rootDir = getRootDir(cwd, config.root || "")
      const tempDir = getTempDir(cwd, rootDir)

      if (command === "serve") {
        const islandDir = path.resolve(tempDir, "island/serve")
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
      if (command === "build") {
        const islandDir = path.resolve(tempDir, "island/build")
        const snippetsDir = path.resolve(islandDir, "snippets")

        await fs.promises.mkdir(islandDir, { recursive: true })
        await fs.promises.mkdir(snippetsDir, { recursive: true })

        if (isSsrBuild || getViteAppEnvironmentNames(config)) return
        await prepareIslandEntries(
          legacyState,
          rootDir,
          islandDir,
          snippetsDir,
          getViteBuildSession(config),
        )

        return {
          build: {
            rolldownOptions: {
              input: legacyState.entries,
            },
          },
        }
      }
    },
    configureServer(server) {
      devServers.add(server)
      server.httpServer?.once("close", () => devServers.delete(server))
      return () => {
        devStates.get(server).moduleEvaluator = new ViteDevModuleEvaluator(server)
      }
    },
    async transformIndexHtml(html, context) {
      const server = devServers.resolve(context)
      if (!server) return html
      const state = devStates.get(server)
      const { moduleEvaluator } = state
      if (moduleEvaluator) {
        /** @type {{default?: RenderedPage[]}} */
        const mod = await moduleEvaluator.importModule("virtual:ssg-pages")
        const ssgPages = mod.default ?? []

        if (ssgPages.length > 0) {
          const activeSnippets = new Set(
            [...state.uniqueSnippets].filter((snippet) =>
              ssgPages.some(({ html }) => html.includes(snippet))
            ),
          )
          state.uniqueSnippets = activeSnippets
        }
      }
      const snippetList = [...state.uniqueSnippets]
      const rootDir = getRootDir(cwd, server.config.root || "")
      const islandDir = path.resolve(getTempDir(cwd, rootDir), "island/serve")
      const snippetsDir = path.resolve(islandDir, "snippets")
      const base = getServeBase(server.config.base || "/")
      await fs.promises.mkdir(snippetsDir, { recursive: true })
      const timestamp = Date.now()
      const prefixBase = base.replace(/\/$/, "")
      const feature = createIslandFeature(
        opts,
        entryGenerator,
        {
          async bundle(plan) {
            await Promise.all(plan.snippets.map((snippet) =>
              fs.promises.writeFile(
                path.resolve(snippetsDir, `snippet-${snippet.index}.tsx`),
                snippet.code,
                "utf8",
              )
            ))
            await Promise.all(plan.entries.map((entry) =>
              fs.promises.writeFile(
                path.resolve(islandDir, `${entry.fileName}.tsx`),
                entry.code,
                "utf8",
              )
            ))
            return plan.entries.map((entry) => ({
              patternIndex: entry.patternIndex,
              fileName: `${entry.fileName}.tsx`,
              cssFiles: [],
            }))
          },
        },
        {
          resolve(fileName) {
            return `${prefixBase}${islandAlias}/${fileName}?t=${timestamp}`
          },
        },
      )
      const result = await processViteDocuments(
        [{ fileName: context.path, url: context.path, html }],
        [feature],
        ["analyze", "generate", "bundle", "compose"],
        createViteCompatibilityTraceHooks(
          getViteBuildSession(server.config),
          "island:dev",
          {
            artifactUpdate: "input-pages",
            inputArtifacts: [{
              schemaVersion: "1",
              id: createIslandSnippetsArtifactId(),
              owner: feature.id,
              mediaType: "application/vnd.minista.island-snippets+json",
              content: JSON.stringify(snippetList),
            }],
          },
        ),
      )
      return result.documents[0]?.html ?? html
    },
    async transform(code, id) {
      if (!/\.(tsx|jsx)$/.test(id)) return null
      const environment = this.environment
      const isDev = environment.config.command === "serve"
      if (!isDev && !environment.config.build.ssr) return null

      let newCode = code
      let sourceMap = null

      if (code.includes("client:")) {
        const sourceTransformer = new RolldownIslandSourceTransformer(
          (source, options) => this.parse(source, options),
        )
        const { code: transformdCode, map, snippets } =
          sourceTransformer.transform(code, id, opts)
        newCode = transformdCode
        sourceMap = map

        const server = isDev
          ? devServers.resolve({ path: "", filename: id })
          : undefined
        const uniqueSnippets = server
          ? devStates.get(server).uniqueSnippets
          : buildStates.get(environment).uniqueSnippets
        for (const snippet of snippets) {
          uniqueSnippets.add(snippet)
        }
      }
      return {
        code: newCode,
        map: sourceMap,
      }
    },
    async generateBundle(_options, bundle) {
      if (this.environment.config.build.ssr) return
      const appEnvironmentNames = getViteAppEnvironmentNames(
        this.environment.getTopLevelConfig(),
      )
      const state = appEnvironmentNames
        ? buildStates.get(this.environment)
        : legacyState
      const { entries, sourcePlan } = state
      const base = getBuildBase(this.environment.config.base || "/")
      const outputClaims = claimStates.get(this.environment).claims
      outputClaims.length = 0

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
      const buildSession = getViteBuildSession(
        this.environment.getTopLevelConfig(),
      )
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
        createViteCompatibilityTraceHooks(buildSession, "island:bundle", {
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
        }),
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
      if (!this.environment.config.build.ssr) return

      const snippetList = [
        ...buildStates.get(this.environment).uniqueSnippets,
      ]

      if (snippetList.length === 0) return

      const topLevelConfig = this.environment.getTopLevelConfig()
      const buildSession = getViteBuildSession(topLevelConfig)
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
        const rootDir = getRootDir(cwd, this.environment.config.root || "")
        await new NodeExternalBuildHandoff().writeIslandSnippets(
          rootDir,
          externalBuildId,
          snippetList,
        )
      }
    },
  })
}
