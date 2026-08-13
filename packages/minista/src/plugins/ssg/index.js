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

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "url"
import { createRequire } from "node:module"
import pc from "picocolors"

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
import {
  mergeRolldownExternal,
  mergeSsrExternal,
} from "../../shared/vite.js"

/** @type {PluginOptions} */
export const defaultOptions = {
  layout: "/src/layouts/index.{tsx,jsx}",
  src: ["/src/pages/**/*.{tsx,jsx,mdx,md}"],
  srcBases: ["/src/pages"],
}

const require = createRequire(import.meta.url)
const { version: ministaVersion } = require("../../../package.json")

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginSsg(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = { ...defaultOptions, ...uOpts }
  const cwd = process.cwd()
  const tempName = "__minista-ssg"
  const SSG_PAGES_ID = "virtual:ssg-pages"
  const SSG_PAGES_VIRTUAL = "\0" + SSG_PAGES_ID
  const externalBuildId = process.env.MINISTA_EXTERNAL_BUILD_ID

  const createBuildState = () => ({
    ssgPages: /** @type {RenderedPage[]} */ ([]),
    projectGraph: /** @type {import("../../core/graph/index.js").ProjectGraphSnapshot | undefined} */ (undefined),
    externalOutputManifest: /** @type {import("../../core/manifest/index.js").OutputManifest | undefined} */ (undefined),
    externalOutputDirectory: "",
    externalClientPlugins: /** @type {readonly import("vite").Plugin[]} */ ([]),
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
   * @param {ResolvedLayout} resolvedLayout
   * @param {readonly ResolvedPage[]} resolvedPages
   * @param {import("../../core/ports/index.js").StaticRenderer<import("react").ReactNode> | undefined} renderer
   * @param {DevRenderCache<RenderedPage>} [renderCache]
   */
  async function updateRenderedPages(
    state,
    resolvedLayout,
    resolvedPages,
    renderer,
    renderCache,
  ) {
    const activePageIds = resolvedPages
      .filter(({ metadata }) => metadata?.draft !== true)
      .map(({ pageId, url }) => String(pageId ?? `url:${url}`))
    renderCache?.retain(activePageIds)
    const pages = await Promise.all(
      resolvedPages.map(async (resolvedPage) => {
        if (resolvedPage.metadata?.draft === true) {
          return null
        }
        const render = async () => {
          const url = resolvedPage.url
          const fileName = getHtmlFileName(url)
          const html = await transformHtml(
            { resolvedLayout, resolvedPage },
            renderer,
          )
          return { url, fileName, html }
        }
        const pageId = String(resolvedPage.pageId ?? `url:${resolvedPage.url}`)
        return renderCache ? renderCache.get(pageId, render) : render()
      }),
    )
    state.ssgPages = pages.filter(
        /** @type {(page: RenderedPage | null) => page is RenderedPage} */
        (page) => page !== null,
      )
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

  /** @param {ViteEnvironmentPreparation} preparation */
  async function prepareAppClient(preparation) {
    const config = preparation.client.getTopLevelConfig()
    if (!getViteAppEnvironmentNames(config)) return
    const state = buildStates.get(preparation.client)
    await prepareClientPages(state, config)
    const rootDir = getRootDir(cwd, preparation.client.config.root || "")
    const throughFile = path.resolve(
      getTempDir(cwd, rootDir),
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

  /** @param {import("vite").Environment | undefined} environment */
  function getOutputClaims(environment) {
    const state = environment ? getBuildState(environment) : legacyState
    if (!state.projectGraph) return []
    const emittedUrls = new Set(state.ssgPages.map(({ url }) => url))
    return [...state.projectGraph.pages.values()]
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
          provides: ["routes", "pages", "html", "html-documents"],
          requires: [],
        },
      },
    },
    enforce: "pre",
    apply(config, { command, isSsrBuild }) {
      return command === "serve" || command === "build"
    },
    config: async (config, { command, isSsrBuild }) => {
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
                  input: { [tempName]: globFile },
                  output: {
                    chunkFileNames: "[name].mjs",
                    entryFileNames: "[name].mjs",
                  },
                },
                outDir: ssrDir,
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
                [tempName]: globFile,
              },
              output: {
                chunkFileNames: "[name].mjs",
                entryFileNames: "[name].mjs",
              },
            },
            outDir: ssrDir,
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
    transformIndexHtml: {
      order: "pre",
      handler(_html, context) {
        if (!devServers.resolve(context)) return
        return [
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
            resolvedLayout,
            resolvedPages,
            state.renderer,
            state.renderCache,
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
      if (this.environment.config.build.ssr) return

      for (const [key, item] of Object.entries(bundle)) {
        if (item.name === tempName && item.type === "chunk") {
          delete bundle[key]
          break
        }
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
