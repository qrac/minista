/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('vite').EnvironmentModuleNode} EnvModuleNode */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('../../features/ssg/index.js').RenderedPage} RenderedPage */
/** @typedef {import('./types').ResolvedLayout} ResolvedLayout */
/** @typedef {import('./types').ResolvedPage} ResolvedPage */
/** @typedef {import('./types').ImportedLayouts} ImportedLayouts */
/** @typedef {import('./types').ImportedPages} ImportedPages */
/** @typedef {import('../../adapters/vite/environment-preparation.js').ViteEnvironmentPreparation} ViteEnvironmentPreparation */
/** @typedef {{fileName: string, source: string | Uint8Array, originalFileNames: readonly string[]}} RenderAsset */

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "url"
import { createRequire } from "node:module"
import pc from "picocolors"
import { normalizePath } from "vite"

import { NodeHtmlDocumentFactory } from "../../adapters/html/index.js"
import { resolveLegacySsgProject } from "../../adapters/vite/legacy-ssg-project.js"
import { NodeExternalBuildHandoff } from "../../adapters/filesystem/external-build-handoff.js"
import { LegacySsgRouteCache } from "../../adapters/vite/legacy-ssg-route-cache.js"
import { createViteReactRenderer } from "../../adapters/vite/react-renderer.js"
import { getViteBuildSession } from "../../adapters/vite/build-session.js"
import { createViteCompatibilityTraceHooks } from "../../adapters/vite/compatibility-lifecycle.js"
import { ViteDevModuleEvaluator } from "../../adapters/vite/dev-module-evaluator.js"
import { ViteDevServerRegistry } from "../../adapters/vite/dev-server-registry.js"
import { ViteDevUpdateAdapter } from "../../adapters/vite/dev-update.js"
import { ViteEnvironmentInputAdapter } from "../../adapters/vite/environment-input.js"
import { ViteEnvironmentState } from "../../adapters/vite/environment-state.js"
import { createViteMdxTransformer } from "../../adapters/vite/mdx-transform.js"
import { getViteAppEnvironmentNames } from "../../adapters/vite/app-config.js"
import { renderViteSsgPages } from "../../adapters/vite/ssg-render-lifecycle.js"
import { createNodeId } from "../../core/graph/index.js"
import { createProjectManifest } from "../../core/manifest/index.js"
import {
  createViteOutputManifest,
  reconcileViteOutputManifest,
} from "../../adapters/vite/output-manifest.js"
import { collectViteOutputClaims } from "../../adapters/vite/output-claims.js"
import { DiagnosticCollector } from "../../core/diagnostics/index.js"
import { applyOutputClaims } from "../../core/graph/index.js"
import { DevPageCache } from "../../features/ssg/dev-page-cache.js"
import { DevRenderCache } from "../../features/ssg/dev-render-cache.js"
import { getGlobImportCode } from "./utils/code.js"
import { formatLayout, resolveLayout } from "./utils/layout.js"
import { transformHtml } from "./utils/html.js"
import { getHtmlFileName } from "../../shared/filename.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { regImage, regStyle } from "../../shared/reg.js"
import {
  collectSsgAssetOutputReferences,
  composeSsgAssetDocument,
} from "../../features/ssg/index.js"
import {
  getBasedAssetUrl,
  getBuildBase,
  getServeBase,
} from "../../shared/url.js"
import {
  mergeAlias,
  mergeRolldownExternal,
  mergeSsrExternal,
} from "../../shared/vite.js"

/**
 * @param {string | Uint8Array} left
 * @param {string | Uint8Array} right
 */
function assetSourcesEqual(left, right) {
  if (typeof left === "string" && typeof right === "string") {
    return left === right
  }
  const encoder = new TextEncoder()
  const leftBytes = typeof left === "string" ? encoder.encode(left) : left
  const rightBytes = typeof right === "string" ? encoder.encode(right) : right
  if (leftBytes.byteLength !== rightBytes.byteLength) return false
  return leftBytes.every((value, index) => value === rightBytes[index])
}

/** @type {PluginOptions} */
export const defaultOptions = {
  layout: "src/layouts/index.{tsx,jsx}",
  src: ["src/pages/**/*.{tsx,jsx,mdx,md}"],
  srcBases: ["src/pages"],
  bundle: {
    outName: "bundle",
  },
  mdx: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
}

const require = createRequire(import.meta.url)
const { version: ministaVersion } = require("../../../package.json")

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginSsg(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = {
    ...defaultOptions,
    ...uOpts,
    bundle: { ...defaultOptions.bundle, ...uOpts.bundle },
    mdx: uOpts.mdx === false
      ? false
      : { ...defaultOptions.mdx, ...uOpts.mdx },
    src: uOpts.src ?? (
      uOpts.mdx === false
        ? ["src/pages/**/*.{tsx,jsx}"]
        : defaultOptions.src
    ),
  }
  const cwd = process.cwd()
  const tempName = "__minista-ssg"
  const assetEntryId = "/@__minista-ssg-assets"
  const SSG_PAGES_ID = "virtual:ssg-pages"
  const SSG_PAGES_VIRTUAL = "\0" + SSG_PAGES_ID
  const externalBuildId = process.env.MINISTA_EXTERNAL_BUILD_ID
  const mdxTransformer = opts.mdx === false
    ? undefined
    : createViteMdxTransformer(opts.mdx)

  const createBuildState = () => ({
    ssgPages: /** @type {RenderedPage[]} */ ([]),
    projectGraph: /** @type {import("../../core/graph/index.js").ProjectGraphSnapshot | undefined} */ (undefined),
    externalOutputManifest: /** @type {import("../../core/manifest/index.js").OutputManifest | undefined} */ (undefined),
    externalOutputDirectory: "",
    externalClientPlugins: /** @type {readonly import("vite").Plugin[]} */ ([]),
    renderAssets: /** @type {RenderAsset[]} */ ([]),
    bundlePlan: /** @type {import("../../features/ssg/index.js").SsgAssetPlan | undefined} */ (undefined),
    bundleReferences: /** @type {Map<string, readonly string[]>} */ (new Map()),
    routeSourceAssets: /** @type {Map<string, readonly string[]>} */ (new Map()),
  })
  const buildStates = new ViteEnvironmentState(createBuildState)
  const legacyState = createBuildState()
  const devServers = new ViteDevServerRegistry()
  const devStates = new ViteEnvironmentState(() => ({
    rootDir: "",
    globFile: "",
    renderer: /** @type {import("../../core/ports/index.js").StaticRenderer<import("react").ReactNode> | undefined} */ (undefined),
    ssgPages: /** @type {RenderedPage[]} */ ([]),
    pageCache: /** @type {DevPageCache<{graph: import("../../core/graph/index.js").ProjectGraphSnapshot, layoutSourceFiles: readonly string[], resolvedLayout: ResolvedLayout, resolvedPages: readonly ResolvedPage[]}>} */ (new DevPageCache()),
    renderCache: /** @type {DevRenderCache<RenderedPage>} */ (new DevRenderCache()),
    routeCache: new LegacySsgRouteCache(),
  }))
  const environmentInput = new ViteEnvironmentInputAdapter()

  /**
   * @param {ReturnType<typeof devStates.get>} state
   * @param {import("../../core/graph/index.js").ProjectGraphSnapshot} graph
   * @param {ResolvedLayout} resolvedLayout
   * @param {readonly ResolvedPage[]} resolvedPages
   * @param {import("../../core/ports/index.js").StaticRenderer<import("react").ReactNode> | undefined} renderer
   * @param {DevRenderCache<RenderedPage>} renderCache
   * @param {import("../../adapters/vite/build-session.js").ViteBuildSession | undefined} session
   */
  async function updateRenderedPages(
    state,
    graph,
    resolvedLayout,
    resolvedPages,
    renderer,
    renderCache,
    session,
  ) {
    const activePageIds = resolvedPages
      .filter(({ metadata }) => metadata?.draft !== true)
      .map(({ pageId, url }) => String(pageId ?? `url:${url}`))
    renderCache?.retain(activePageIds)
    const resolvedById = new Map(
      resolvedPages.map((page) => [page.pageId, page]),
    )
    const rendered = await renderViteSsgPages(
      graph,
      {
        async render(page) {
          const resolvedPage = resolvedById.get(page.id)
          if (!resolvedPage) {
            throw new Error(`Resolved page ${page.id} is not available.`)
          }
          const render = async () => ({
            url: page.url,
            fileName: getHtmlFileName(page.url),
            html: await transformHtml(
              { resolvedLayout, resolvedPage },
              renderer,
            ),
          })
          return (await renderCache.get(String(page.id), render)).html
        },
      },
      {
        artifacts: session?.artifacts,
        diagnostics: session?.diagnostics,
        onTrace: createViteCompatibilityTraceHooks(
          session,
          "ssg:dev-render",
        ).onTrace,
      },
    )
    state.ssgPages = [...rendered.pages]
  }

  /**
   * Render the production pages after the render bundle is available.
   * @param {ReturnType<typeof createBuildState>} state
   * @param {import("vite").ResolvedConfig | import("vite").InlineConfig} config
   */
  async function prepareClientPages(state, config) {
    const rootDir = getRootDir(cwd, config.root || "")
    const tempDir = getTempDir(cwd, rootDir)
    const ssrFile = path.resolve(tempDir, "ssr", `${tempName}.mjs`)
    const throughDir = path.resolve(tempDir, "through")
    const throughFile = path.resolve(throughDir, `${tempName}.js`)
    const buildSession = getViteBuildSession(config)
    const renderer = await createViteReactRenderer({ resolve: config.resolve })
    let projectName = path.basename(rootDir)
    try {
      const packageJson = JSON.parse(
        await fs.promises.readFile(path.resolve(rootDir, "package.json"), "utf8"),
      )
      if (typeof packageJson.name === "string" && packageJson.name) {
        projectName = packageJson.name
      }
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        Reflect.get(error, "code") !== "ENOENT"
      ) throw error
    }
    const importUrl = pathToFileURL(ssrFile).href
    const { LAYOUTS = {}, PAGES = {} } = await import(importUrl)
    const formatedLayout = formatLayout(LAYOUTS)
    const resolvedLayout = await resolveLayout(formatedLayout)
    const project = await resolveLegacySsgProject(PAGES, opts, projectName)
    const resolvedPages = project.pages

    const errors = project.diagnostics.filter(
      ({ severity }) => severity === "error",
    )
    if (errors.length > 0) {
      throw new Error(
        errors.map(({ code, message }) => `[${code}] ${message}`).join("\n"),
      )
    }

    const resolvedById = new Map(
      resolvedPages.map((page) => [page.pageId, page]),
    )
    const rendered = await renderViteSsgPages(
      project.graph,
      {
        async render(page) {
          const resolvedPage = resolvedById.get(page.id)
          if (!resolvedPage) {
            throw new Error(`Resolved page ${page.id} is not available.`)
          }
          return transformHtml({ resolvedLayout, resolvedPage }, renderer)
        },
      },
      {
        artifacts: buildSession?.artifacts,
        diagnostics: buildSession?.diagnostics,
        onTrace: createViteCompatibilityTraceHooks(
          buildSession,
          "ssg:render",
        ).onTrace,
      },
    )
    state.ssgPages = [...rendered.pages]
    state.projectGraph = rendered.graph

    if (buildSession?.state) buildSession.state.projectGraph = rendered.graph

    if (!buildSession && externalBuildId) {
      await new NodeExternalBuildHandoff().writeRenderedPages(
        rootDir,
        externalBuildId,
        state.ssgPages,
      )
    }
    await fs.promises.mkdir(throughDir, { recursive: true })
    await fs.promises.writeFile(throughFile, `console.log("")`, "utf8")
  }

  /**
   * Preserve the assets produced by the render environment. CSS Modules used
   * by the rendered HTML must not be compiled a second time in the client
   * environment because environment-specific transforms can change class names.
   *
   * @param {ReturnType<typeof createBuildState>} state
   * @param {any} renderOutput Vite build output at the adapter boundary.
   * @param {string} globFile
   * @param {import("vite").ResolvedConfig | import("vite").InlineConfig} config
   */
  function collectRenderAssets(state, renderOutput, globFile, config) {
    const output = /** @type {(import("vite").Rollup.OutputChunk | import("vite").Rollup.OutputAsset)[]} */ (Array.isArray(renderOutput)
      ? renderOutput.flatMap((result) => result.output)
      : renderOutput.output)
    const normalizedGlobFile = normalizePath(globFile)
    const entry = output.find(
      (item) =>
        item.type === "chunk" &&
        item.facadeModuleId === normalizedGlobFile,
    )
    const cssFiles = entry?.type === "chunk" && entry.viteMetadata?.importedCss
      ? [...entry.viteMetadata.importedCss]
      : []
    const imageFiles = entry?.type === "chunk" && entry.viteMetadata?.importedAssets
      ? [...entry.viteMetadata.importedAssets]
      : []
    const assetFiles = new Set([...cssFiles, ...imageFiles])

    state.renderAssets = output.filter(
      /** @returns {item is import("vite").Rollup.OutputAsset} */
      (item) => item.type === "asset" && assetFiles.has(item.fileName),
    ).map((asset) => ({
      fileName: asset.fileName,
      source: asset.source,
      originalFileNames: Object.freeze([...asset.originalFileNames]),
    }))
    state.bundlePlan = Object.freeze({
      cssFiles: Object.freeze(cssFiles),
      imageFiles: Object.freeze(imageFiles),
      rewriteRootImages:
        getBuildBase(config.base || "/") === "./" ||
        getBuildBase(config.base || "/") === "",
    })
  }

  /**
   * The external Vite CLI fallback runs render and client as separate
   * processes. Restore canonical render assets from the render output folder.
   *
   * @param {ReturnType<typeof createBuildState>} state
   * @param {import("vite").ResolvedConfig | import("vite").InlineConfig} config
   */
  async function collectLegacyRenderAssets(state, config) {
    const rootDir = getRootDir(cwd, config.root || "")
    const renderDir = path.resolve(getTempDir(cwd, rootDir), "ssr")
    /** @type {string[]} */
    const files = []

    /** @param {string} directory */
    async function visit(directory) {
      let entries
      try {
        entries = await fs.promises.readdir(directory, { withFileTypes: true })
      } catch (error) {
        if (error && typeof error === "object" &&
          Reflect.get(error, "code") === "ENOENT") return
        throw error
      }
      await Promise.all(entries.map(async (entry) => {
        const target = path.resolve(directory, entry.name)
        if (entry.isDirectory()) await visit(target)
        else if (entry.isFile()) files.push(target)
      }))
    }

    await visit(renderDir)
    const assetFiles = files.filter((file) => !/\.m?js(?:\.map)?$/i.test(file))
    state.renderAssets = await Promise.all(assetFiles.map(async (file) => ({
      fileName: normalizePath(path.relative(renderDir, file)),
      source: await fs.promises.readFile(file),
      originalFileNames: Object.freeze([]),
    })))
    state.bundlePlan = Object.freeze({
      cssFiles: Object.freeze(
        state.renderAssets
          .filter(({ fileName }) => regStyle.test(fileName))
          .map(({ fileName }) => fileName),
      ),
      imageFiles: Object.freeze(
        state.renderAssets
          .filter(({ fileName }) => regImage.test(fileName))
          .map(({ fileName }) => fileName),
      ),
      rewriteRootImages:
        getBuildBase(config.base || "/") === "./" ||
        getBuildBase(config.base || "/") === "",
    })
  }

  /**
   * Compose canonical render assets into HTML and retain route-to-output edges
   * for output claims and the public project manifest.
   *
   * @param {ReturnType<typeof createBuildState>} state
   * @param {import("vite").ResolvedConfig | import("vite").InlineConfig} config
   */
  async function composeClientAssets(state, config) {
    const plan = state.bundlePlan
    if (!plan || !state.projectGraph) return
    const base = getBuildBase(config.base || "/")
    const factory = new NodeHtmlDocumentFactory()
    const pageIds = new Map(
      [...state.projectGraph.pages.values()].map((page) => [page.url, page.id]),
    )
    const session = getViteBuildSession(config)
    const moduleGraph = session?.state?.renderModuleGraph
    const rootDir = getRootDir(cwd, config.root || "")
    state.bundleReferences.clear()
    state.routeSourceAssets.clear()

    if (moduleGraph) {
      const emittedSources = new Set(
        state.renderAssets.flatMap((asset) =>
          asset.originalFileNames.map((sourceFile) =>
            normalizePath(path.resolve(rootDir, sourceFile))
          )
        ),
      )
      const assetModules = [...moduleGraph.keys()].filter(
        (id) => regStyle.test(id) || emittedSources.has(id),
      )
      const routeClosures = new Map()
      const claimedAssets = new Set()

      for (const route of state.projectGraph.routes.values()) {
        const entry = normalizePath(path.resolve(
          rootDir,
          route.sourceFile.replace(/^\/+/, ""),
        ))
        const seen = new Set()
        const pending = [entry]
        while (pending.length > 0) {
          const current = pending.pop()
          if (!current || seen.has(current)) continue
          seen.add(current)
          for (const dependency of moduleGraph.get(current) ?? []) {
            pending.push(dependency)
          }
        }
        const assets = assetModules.filter((id) => seen.has(id))
        for (const id of assets) claimedAssets.add(id)
        routeClosures.set(route.id, assets)
      }

      // Layout and other modules imported by the SSG root but not by an
      // individual page are shared by every route.
      const sharedAssets = assetModules.filter((id) => !claimedAssets.has(id))
      for (const page of state.projectGraph.pages.values()) {
        state.routeSourceAssets.set(
          page.url,
          Object.freeze([
            ...new Set([
              ...(routeClosures.get(page.routeId) ?? []),
              ...sharedAssets,
            ]),
          ]),
        )
      }
    }

    const assetOutputs = new Map()
    for (const asset of state.renderAssets) {
      for (const sourceFile of asset.originalFileNames) {
        assetOutputs.set(
          normalizePath(path.resolve(rootDir, sourceFile)),
          asset.fileName,
        )
      }
    }

    state.ssgPages = await Promise.all(state.ssgPages.map(async (page) => {
      const pageId = pageIds.get(page.url) ?? createNodeId("page", page.url)
      const document = factory.parse({ pageId, html: page.html })
      const sourceFiles = state.routeSourceAssets.get(page.url) ?? []
      const graphReferences = sourceFiles.flatMap((sourceFile) =>
        regStyle.test(sourceFile)
          ? plan.cssFiles
          : assetOutputs.has(sourceFile)
            ? [/** @type {string} */ (assetOutputs.get(sourceFile))]
            : [],
      )
      const references = Object.freeze([
        ...new Set([
          ...collectSsgAssetOutputReferences(document, plan),
          ...graphReferences,
        ]),
      ])
      state.bundleReferences.set(page.url, references)
      composeSsgAssetDocument(document, plan, {
        resolve(fileName) {
          return getBasedAssetUrl(base, page.fileName, fileName)
        },
      })
      await session?.artifacts.put({
        schemaVersion: "1",
        id: createNodeId("artifact", "route-assets", pageId),
        owner: createNodeId("feature", "ssg"),
        mediaType: "application/vnd.minista.route-assets+json",
        content: JSON.stringify({
          pageId,
          url: page.url,
          sourceFiles,
          fileNames: references,
        }),
      })
      return Object.freeze({ ...page, html: document.serialize() })
    }))
  }

  /** @param {ViteEnvironmentPreparation} preparation */
  async function prepareAppClient(preparation) {
    const config = preparation.client.getTopLevelConfig()
    if (!getViteAppEnvironmentNames(config)) return
    const state = buildStates.get(preparation.client)
    const rootDir = getRootDir(cwd, preparation.render.config.root || "")
    const globFile = path.resolve(
      getTempDir(cwd, rootDir),
      "glob",
      `${tempName}.js`,
    )
    collectRenderAssets(state, preparation.renderOutput, globFile, config)
    await prepareClientPages(state, config)
    await composeClientAssets(state, config)
    const clientRootDir = getRootDir(
      cwd,
      preparation.client.config.root || "",
    )
    const throughFile = path.resolve(
      getTempDir(cwd, clientRootDir),
      "through",
      `${tempName}.js`,
    )
    environmentInput.merge(preparation.client, { [tempName]: throughFile })
  }

  /** @param {import("vite").Environment} environment */
  function getBuildState(environment) {
    return getViteAppEnvironmentNames(environment.getTopLevelConfig())
      ? buildStates.get(environment)
      : legacyState
  }

  /**
   * @param {import("vite").Environment | undefined} environment
   * @returns {import("../../core/graph/index.js").OutputClaim[]}
   */
  function getOutputClaims(environment) {
    const state = environment ? getBuildState(environment) : legacyState
    if (!state.projectGraph) return []
    const emittedUrls = new Set(state.ssgPages.map(({ url }) => url))
    const htmlClaims = [...state.projectGraph.pages.values()]
      .filter(({ url }) => emittedUrls.has(url))
      .map((page) => Object.freeze({
        id: createNodeId("artifact", "ssg-output", page.id),
        kind: /** @type {const} */ ("html"),
        owner: createNodeId("feature", "ssg"),
        source: `page:${page.id}`,
        fileName: getHtmlFileName(page.url),
        pageUrls: Object.freeze([page.url]),
        dependencies: Object.freeze([]),
      }))
    const cssFiles = new Set(state.bundlePlan?.cssFiles ?? [])
    const assetClaims = state.renderAssets.map((asset) => Object.freeze({
      id: createNodeId("artifact", "ssg-asset-output", asset.fileName),
      kind: /** @type {"style" | "image" | "data"} */ (
        cssFiles.has(asset.fileName)
          ? "style"
          : regImage.test(asset.fileName)
            ? "image"
            : "data"
      ),
      owner: createNodeId("feature", "ssg"),
      source: asset.originalFileNames[0] ?? opts.bundle.outName,
      fileName: asset.fileName,
      pageUrls: Object.freeze(
        [...state.bundleReferences.entries()]
          .filter(([, files]) => files.includes(asset.fileName))
          .map(([url]) => url),
      ),
      dependencies: Object.freeze([]),
    }))
    return [...htmlClaims, ...assetClaims]
  }

  return {
    name: "vite-plugin:minista-ssg",
    api: {
      minista: {
        prepareClient: prepareAppClient,
        outputClaims: getOutputClaims,
        feature: {
          id: "ssg",
          apiVersion: 1,
          options: opts,
          provides: [
            "routes",
            "pages",
            "html",
            "html-documents",
            "client-bundle",
            ...(opts.mdx === false ? [] : ["mdx-modules"]),
          ],
          requires: [],
        },
      },
    },
    enforce: "pre",
    apply(config, { command, isSsrBuild }) {
      return command === "serve" || command === "build"
    },
    config: async (config, { command, isSsrBuild, mode }) => {
      mdxTransformer?.setDevelopment(mode === "development")
      const names = getViteAppEnvironmentNames(config)
      const isAppBuild = command === "build" && Boolean(names)
      const isSsr = command === "build" && !isAppBuild && Boolean(isSsrBuild)
      const isBuild = command === "build" && !isAppBuild && !isSsrBuild
      const rootDir = getRootDir(cwd, config.root || "")
      const tempDir = getTempDir(cwd, rootDir)
      const globDir = path.resolve(tempDir, "glob")
      const globFile = path.resolve(globDir, `${tempName}.js`)
      const ssrDir = path.resolve(tempDir, "ssr")
      const throughFile = path.resolve(tempDir, "through", `${tempName}.js`)

      if (command === "serve" || isSsr || isAppBuild) {
        const code = getGlobImportCode(opts)
        await fs.promises.mkdir(globDir, { recursive: true })
        await fs.promises.writeFile(globFile, code, "utf8")
      }
      if (isAppBuild) {
        const renderName = /** @type {NonNullable<typeof names>} */ (names)
          .renderName
        const clientName = /** @type {NonNullable<typeof names>} */ (names)
          .clientName
        const renderEnvironment = config.environments?.[renderName]
        return {
          environments: {
            [renderName]: {
              build: {
                rolldownOptions: {
                  external: mergeRolldownExternal(
                    renderEnvironment?.build?.rolldownOptions?.external,
                    [
                      "minista/context",
                      "minista/head",
                      "react",
                      "react/jsx-runtime",
                      "react/jsx-dev-runtime",
                      "react-dom",
                      "react-dom/server",
                    ],
                  ),
                  input: { [opts.bundle.outName]: globFile },
                  output: {
                    chunkFileNames: "[name].mjs",
                    entryFileNames: `${tempName}.mjs`,
                  },
                },
                outDir: ssrDir,
                emitAssets: true,
              },
            },
            [clientName]: {
              build: {
                rolldownOptions: {
                  input: { [tempName]: throughFile },
                },
              },
            },
          },
          ssr: {
            external: mergeSsrExternal(config, [
              "minista/context",
              "minista/head",
            ]),
          },
        }
      }
      if (command === "serve") {
        return {
          resolve: {
            alias: mergeAlias(config, [
              { find: assetEntryId, replacement: globFile },
            ]),
          },
          ssr: {
            external: mergeSsrExternal(config, [
              "minista/context",
              "minista/head",
            ]),
          },
        }
      }
      if (isSsr) {
        return {
          build: {
            rolldownOptions: {
              input: {
                [opts.bundle.outName]: globFile,
              },
              output: {
                chunkFileNames: "[name].mjs",
                entryFileNames: `${tempName}.mjs`,
              },
            },
            outDir: ssrDir,
            emitAssets: true,
          },
          ssr: {
            external: mergeSsrExternal(config, [
              "minista/context",
              "minista/head",
            ]),
          },
        }
      }
      if (isBuild) {
        await prepareClientPages(legacyState, config)
        await collectLegacyRenderAssets(legacyState, config)
        await composeClientAssets(legacyState, config)

        return {
          build: {
            rolldownOptions: {
              input: {
                [tempName]: throughFile,
              },
            },
          },
        }
      }
    },
    resolveId(id) {
      if (id === SSG_PAGES_ID) {
        return SSG_PAGES_VIRTUAL
      }
      return null
    },
    load(id) {
      if (id === SSG_PAGES_VIRTUAL) {
        const server = devServers.resolveEnvironment(this.environment)
        const pages = server ? devStates.get(server).ssgPages : []
        return `export default ${JSON.stringify(pages)};`
      }
      return null
    },
    async transform(value, id) {
      const result = await mdxTransformer?.transform(value, id)
      if (!result) return
      for (const message of result.messages) {
        this.warn({
          id,
          message: String(message),
        })
      }
      return { code: result.code, map: result.map }
    },
    transformIndexHtml: {
      order: "pre",
      handler(_html, context) {
        const server = devServers.resolve(context)
        if (!server) return
        const base = getServeBase(server.config.base || "/").replace(/\/$/, "")
        return [
          {
            tag: "script",
            attrs: {
              type: "module",
              src: `${base}${assetEntryId}`,
            },
            injectTo: "head",
          },
          {
            tag: "script",
            attrs: { type: "module" },
            children: `if (import.meta.hot) {
  import.meta.hot.on("minista:full-reload", ({ paths }) => {
    const base = import.meta.env.BASE_URL.replace(/\\/$/, "")
    const pathname = decodeURI(location.pathname)
    const routePath = base && pathname.startsWith(base)
      ? pathname.slice(base.length) || "/"
      : pathname
    if (paths.includes(routePath)) location.reload()
  })
}`,
            injectTo: "head",
          },
        ]
      },
    },
    async configureServer(server) {
      devServers.add(server)
      server.httpServer?.once("close", () => devServers.delete(server))
      const state = devStates.get(server)
      state.rootDir = getRootDir(cwd, server.config.root || "")
      state.globFile = path.resolve(
        getTempDir(cwd, state.rootDir),
        "glob",
        `${tempName}.js`,
      )
      state.renderer = await createViteReactRenderer({
        resolve: server.config.resolve,
      })
      return () => {
        const evaluator = new ViteDevModuleEvaluator(server)

        async function loadDevPages() {
          /** @type {{LAYOUTS?: ImportedLayouts, PAGES?: ImportedPages}} */
          const modules = await evaluator.importModule(state.globFile)
          const { LAYOUTS = {}, PAGES = {} } = modules
          const formatedLayout = formatLayout(LAYOUTS)
          const resolvedLayout = await resolveLayout(formatedLayout)
          const project = await state.routeCache.resolve(PAGES, opts)
          const resolvedPages = project.pages

          const errors = project.diagnostics.filter(
            ({ severity }) => severity === "error",
          )
          if (errors.length > 0) {
            throw new Error(
              errors
                .map(({ code, message }) => `[${code}] ${message}`)
                .join("\n"),
            )
          }

          await updateRenderedPages(
            state,
            project.graph,
            resolvedLayout,
            resolvedPages,
            state.renderer,
            state.renderCache,
            getViteBuildSession(server.config),
          )
          evaluator.invalidateModule(SSG_PAGES_VIRTUAL)
          const layoutSourceFiles = Object.keys(LAYOUTS).map((sourceFile) =>
            path.resolve(state.rootDir, sourceFile.replace(/^\/+/, "")),
          )
          return {
            graph: project.graph,
            layoutSourceFiles: Object.freeze(layoutSourceFiles),
            resolvedLayout,
            resolvedPages,
          }
        }

        server.middlewares.use(async (req, res, next) => {
          try {
            const base = server.config.base || "/"
            const originalUrl = req.originalUrl || ""
            const normalizedBase = base
              .replace(/\/+$/, "")
              .replace(/^([^/])/, "/$1")
            const url = originalUrl.startsWith(normalizedBase)
              ? originalUrl.slice(normalizedBase.length) || "/"
              : originalUrl
            const { resolvedLayout, resolvedPages } = await state.pageCache.get(
              loadDevPages,
            )
            const resolvedPage = resolvedPages.find((page) => page.url === url)

            let html = ""

            if (resolvedPage) {
              html =
                state.ssgPages.find((page) => page.url === resolvedPage.url)
                  ?.html ??
                (await transformHtml(
                  { resolvedLayout, resolvedPage },
                  state.renderer,
                ))
              html = await server.transformIndexHtml(originalUrl, html)
              res.statusCode = 200
              res.setHeader("Content-Type", "text/html")
              res.end(html)
            } else {
              next()
            }
          } catch (e) {
            if (e instanceof Error) evaluator.fixStacktrace(e)
            next(e)
          }
        })
      }
    },
    hotUpdate: {
      order: "pre",
      handler({ modules, server, timestamp }) {
        if (this.environment.name !== "ssr") return
        const ownerServer = devServers.resolve({
          path: "",
          filename: modules[0]?.id ?? "",
          server,
        }) ?? server
        const state = devStates.get(ownerServer)
        const updates = new ViteDevUpdateAdapter(server)

        /**
         * @param {string | undefined | null} id
         * @returns {string | undefined}
         */
        const stripQuery = (id) => (id ? id.split("?")[0] : undefined)

        /**
         * @param {EnvModuleNode | null | undefined} mod
         * @param {string} globFileAbs
         * @param {string} virtualId
         * @returns {boolean}
         */
        function isReachableFromGlob(mod, globFileAbs, virtualId) {
          /** @type {Set<EnvModuleNode>} */
          const seen = new Set()
          /** @type {EnvModuleNode[]} */
          const q = []

          if (!mod) return false
          q.push(mod)

          const rootA = stripQuery(globFileAbs)
          const rootB = stripQuery(virtualId)

          while (q.length) {
            const cur = q.shift()
            if (!cur || seen.has(cur)) continue
            seen.add(cur)

            if (!cur.importers) continue
            for (const imp of cur.importers) {
              if (!imp) continue
              const impId = stripQuery(imp.id)
              if (impId === rootA || impId === rootB) {
                return true
              }
              q.push(imp)
            }
          }
          return false
        }

        const touchSsrHtml = modules.some((m) =>
          isReachableFromGlob(m, state.globFile, SSG_PAGES_VIRTUAL),
        )

        updates.invalidateModuleById(
          this.environment.name,
          SSG_PAGES_VIRTUAL,
          timestamp,
          true,
        )

        if (touchSsrHtml) {
          /** @type {string[] | undefined} */
          let affectedPageUrls
          const snapshot = state.pageCache.peek()
          if (snapshot) {
            const routeBySourceFile = new Map(
              [...snapshot.graph.routes.values()].map((route) => [
                path.resolve(state.rootDir, route.sourceFile),
                route,
              ]),
            )
            const routeSourceFiles = [...routeBySourceFile.keys()]
            const affectedLayouts = updates.findAffectedFiles(
              modules,
              snapshot.layoutSourceFiles,
            )
            const affectedRouteFiles = updates.findAffectedFiles(
              modules,
              routeSourceFiles,
            )

            if (affectedLayouts.length > 0 || affectedRouteFiles.length === 0) {
              state.renderCache.invalidate()
              if (affectedLayouts.length === 0) state.routeCache.clear()
            } else {
              const affectedRoutes = affectedRouteFiles.flatMap(
                (sourceFile) => {
                  const route = routeBySourceFile.get(sourceFile)
                  return route ? [route] : []
                },
              )
              state.routeCache.invalidate(
                affectedRoutes.map(({ sourceFile }) => sourceFile),
              )
              const routeIds = new Set(affectedRoutes.map(({ id }) => id))
              const pageIds = [...snapshot.graph.pages.values()]
                .filter(({ routeId }) => routeIds.has(routeId))
                .map(({ id }) => id)
              affectedPageUrls = [...snapshot.graph.pages.values()]
                .filter(({ id }) => pageIds.includes(id))
                .map(({ url }) => url)
              state.renderCache.invalidate(pageIds)
            }
          } else {
            state.renderCache.invalidate()
          }
          state.pageCache.invalidate()
          const rel = modules[0]?.id
            ? stripQuery(path.relative(server.config.root, modules[0].id))
            : ""
          server.config.logger.info(
            [pc.dim("(ssr)"), pc.green("page reload"), pc.dim(rel)]
              .filter(Boolean)
              .join(" "),
            { timestamp: true, clear: false },
          )
          if (affectedPageUrls && affectedPageUrls.length > 0) {
            updates.reloadPages(affectedPageUrls)
          } else {
            updates.fullReload()
          }
          return []
        }

        let hasSsrOnly = false

        const isKnownInClient = (/** @type {EnvModuleNode} */ mod) => {
          if (!mod?.id) return false
          const file = mod.file ?? stripQuery(mod.id)
          return updates.hasModule("client", { id: mod.id, file })
        }

        /** @type {EnvModuleNode[]} */
        const ssrOnlyModules = []
        for (const mod of modules) {
          if (!mod?.id) continue
          if (isKnownInClient(mod)) continue
          ssrOnlyModules.push(mod)
          hasSsrOnly = true
        }

        if (hasSsrOnly) {
          updates.invalidateModules(
            this.environment.name,
            ssrOnlyModules,
            timestamp,
            true,
          )
          state.routeCache.clear()
          state.renderCache.invalidate()
          state.pageCache.invalidate()
          const rel = stripQuery(
            path.relative(server.config.root, modules[0].id || ""),
          )
          server.config.logger.info(
            [pc.dim("(ssr)"), pc.green("page reload"), pc.dim(rel)].join(" "),
            { timestamp: true, clear: false },
          )
          updates.fullReload()
          return []
        }
      },
    },
    async buildStart() {
      if (this.environment.config.build.ssr) return
      const state = getBuildState(this.environment)
      state.externalOutputManifest = undefined
      state.externalOutputDirectory = ""
      state.externalClientPlugins = []
      if (!state.ssgPages.length) return

      await Promise.all(
        state.ssgPages.map((ssgPage) => {
          this.emitFile({
            type: "asset",
            source: ssgPage.html,
            fileName: ssgPage.fileName,
          })
        }),
      )
    },
    generateBundle(options, bundle) {
      if (this.environment.config.build.ssr) {
        const session = getViteBuildSession(
          this.environment.getTopLevelConfig(),
        )
        if (session?.state) {
          const moduleGraph = new Map()
          for (const id of this.getModuleIds()) {
            const info = this.getModuleInfo(id)
            if (!info) continue
            const moduleId = normalizePath(id.split("?")[0])
            moduleGraph.set(
              moduleId,
              Object.freeze([
                ...info.importedIds,
                ...info.dynamicallyImportedIds,
              ].map((dependency) =>
                normalizePath(dependency.split("?")[0])
              )),
            )
          }
          session.state.renderModuleGraph = moduleGraph
        }
        return
      }

      for (const [key, item] of Object.entries(bundle)) {
        if (item.name === tempName && item.type === "chunk") {
          delete bundle[key]
          break
        }
      }

      const state = getBuildState(this.environment)
      for (const asset of state.renderAssets) {
        const bundled = bundle[asset.fileName]
        if (bundled?.type === "asset" &&
          assetSourcesEqual(bundled.source, asset.source)) {
          continue
        }
        this.emitFile({
          type: "asset",
          source: asset.source,
          fileName: asset.fileName,
        })
      }
    },
    writeBundle(options, bundle) {
      const state = getBuildState(this.environment)
      const buildSession = getViteBuildSession(
        this.environment.getTopLevelConfig(),
      )
      if (
        this.environment.config.build.ssr ||
        buildSession ||
        !externalBuildId ||
        !state.projectGraph
      ) {
        return
      }
      state.externalOutputManifest = createViteOutputManifest(
        /** @type {import("../../adapters/vite/app-builder.js").ViteBuildOutput} */ ({
          output: Object.values(bundle),
        }),
        {
          environment: this.environment.name,
          base: this.environment.config.base,
        },
      )
      state.externalOutputDirectory = options.dir ??
        this.environment.config.build.outDir
      state.externalClientPlugins = this.environment.config.plugins
    },
    async closeBundle() {
      const state = getBuildState(this.environment)
      if (
        !state.externalOutputManifest ||
        !state.externalOutputDirectory ||
        !externalBuildId ||
        !state.projectGraph
      ) {
        return
      }
      const outputManifest = await reconcileViteOutputManifest(
        state.externalOutputManifest,
        {
          outDir: state.externalOutputDirectory,
          base: this.environment.config.base,
        },
      )
      const diagnostics = new DiagnosticCollector()
      const collected = await collectViteOutputClaims(
        state.externalClientPlugins,
        this.environment,
      )
      const claimedGraph = applyOutputClaims(
        state.projectGraph,
        collected.claims,
        collected.features,
        outputManifest,
        diagnostics,
      )
      const rootDir = getRootDir(cwd, this.environment.config.root || "")
      await new NodeExternalBuildHandoff().write(
        rootDir,
        externalBuildId,
        createProjectManifest(claimedGraph, {
          version: ministaVersion,
          createdAt: new Date().toISOString(),
          diagnostics: diagnostics.summary(),
          outputManifest,
        }),
      )
    },
  }
}
