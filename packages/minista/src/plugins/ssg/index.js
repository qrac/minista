/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('vite').EnvironmentModuleNode} EnvModuleNode */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('./types').SsgPage} SsgPage */
/** @typedef {import('./types').ResolvedLayout} ResolvedLayout */
/** @typedef {import('./types').ResolvedPage} ResolvedPage */
/** @typedef {import('./types').ImportedLayouts} ImportedLayouts */
/** @typedef {import('./types').ImportedPages} ImportedPages */
/** @typedef {import('../../adapters/vite/environment-preparation.js').ViteEnvironmentPreparation} ViteEnvironmentPreparation */

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "url"
import pc from "picocolors"

import { resolveLegacySsgProject } from "../../adapters/vite/legacy-ssg-project.js"
import { createViteReactRenderer } from "../../adapters/vite/react-renderer.js"
import { getViteBuildSession } from "../../adapters/vite/build-session.js"
import { ViteDevModuleEvaluator } from "../../adapters/vite/dev-module-evaluator.js"
import { ViteDevUpdateAdapter } from "../../adapters/vite/dev-update.js"
import { ViteEnvironmentInputAdapter } from "../../adapters/vite/environment-input.js"
import { getViteAppEnvironmentNames } from "../../adapters/vite/app-config.js"
import { createNodeId } from "../../core/graph/index.js"
import { createRenderedPagesArtifactId } from "../../features/ssg/index.js"
import { DevPageCache } from "../../features/ssg/dev-page-cache.js"
import { getGlobImportCode, getSsgExportCode } from "./utils/code.js"
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

  let isDev = false
  let isSsr = false
  let isBuild = false
  let isAppBuild = false
  /** @type {Required<import("../../adapters/vite/app-config.js").ViteAppEnvironmentNames> | undefined} */
  let appEnvironmentNames

  let rootDir = ""
  let tempDir = ""
  let globDir = ""
  let globFile = ""
  let ssrDir = ""
  let ssrFile = ""
  let ssgDir = ""
  let ssgFile = ""
  /** @type {SsgPage[]} */
  let ssgPages = []
  let throughDir = ""
  let throughFile = ""
  /** @type {import("../../core/ports/index.js").StaticRenderer<import("react").ReactNode> | undefined} */
  let renderer
  /** @type {import("../../adapters/vite/build-session.js").ViteBuildSession | undefined} */
  let buildSession
  const environmentInput = new ViteEnvironmentInputAdapter()
  /** @type {DevPageCache<{resolvedLayout: ResolvedLayout, resolvedPages: readonly ResolvedPage[]}>} */
  const devPageCache = new DevPageCache()

  /**
   * @param {ResolvedLayout} resolvedLayout
   * @param {readonly ResolvedPage[]} resolvedPages
   */
  async function selfUpdateResolvedToSsgPages(resolvedLayout, resolvedPages) {
    const pages = await Promise.all(
      resolvedPages.map(async (resolvedPage) => {
        if (resolvedPage.metadata?.draft === true) {
          return null
        }
        const url = resolvedPage.url
        const fileName = getHtmlFileName(url)
        const html = await transformHtml({ resolvedLayout, resolvedPage }, renderer)
        return {
          url,
          fileName,
          html,
        }
      }),
    )
    ssgPages = pages.filter(
        /** @type {(page: SsgPage | null) => page is SsgPage} */
        (page) => page !== null,
      )
  }

  /** Render the production pages after the render bundle is available. */
  async function prepareClientPages() {
    const importUrl = pathToFileURL(ssrFile).href
    const { LAYOUTS = {}, PAGES = {} } = await import(importUrl)
    const formatedLayout = formatLayout(LAYOUTS)
    const resolvedLayout = await resolveLayout(formatedLayout)
    const project = await resolveLegacySsgProject(PAGES, opts)
    const resolvedPages = project.pages

    const errors = project.diagnostics.filter(
      ({ severity }) => severity === "error",
    )
    if (errors.length > 0) {
      throw new Error(
        errors.map(({ code, message }) => `[${code}] ${message}`).join("\n"),
      )
    }

    await selfUpdateResolvedToSsgPages(resolvedLayout, resolvedPages)

    if (buildSession) {
      await buildSession.artifacts.put({
        schemaVersion: "1",
        id: createRenderedPagesArtifactId(),
        owner: createNodeId("feature", "ssg"),
        mediaType: "application/vnd.minista.rendered-pages+json",
        content: JSON.stringify(ssgPages),
      })
    }

    const code = getSsgExportCode(ssgPages)
    await fs.promises.mkdir(ssgDir, { recursive: true })
    await fs.promises.writeFile(ssgFile, code, "utf8")
    await fs.promises.mkdir(throughDir, { recursive: true })
    await fs.promises.writeFile(throughFile, `console.log("")`, "utf8")
  }

  /** @param {ViteEnvironmentPreparation} preparation */
  async function prepareAppClient(preparation) {
    if (!isAppBuild) return
    await prepareClientPages()
    environmentInput.merge(preparation.client, { [tempName]: throughFile })
  }

  return {
    name: "vite-plugin:minista-ssg",
    api: {
      minista: {
        prepareClient: prepareAppClient,
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
      globDir = path.resolve(tempDir, "glob")
      globFile = path.resolve(globDir, `${tempName}.js`)
      ssrDir = path.resolve(tempDir, "ssr")
      ssrFile = path.resolve(ssrDir, `${tempName}.mjs`)
      ssgDir = path.resolve(tempDir, "ssg")
      ssgFile = path.resolve(ssgDir, `${tempName}.mjs`)
      throughDir = path.resolve(tempDir, "through")
      throughFile = path.resolve(throughDir, `${tempName}.js`)

      if (isDev || isSsr || isAppBuild) {
        const code = getGlobImportCode(opts)
        await fs.promises.mkdir(globDir, { recursive: true })
        await fs.promises.writeFile(globFile, code, "utf8")
      }
      if (isDev || isBuild || isAppBuild) {
        renderer = await createViteReactRenderer(config)
      }
      if (isAppBuild) {
        return {
          ssr: {
            external: mergeSsrExternal(config, [
              "minista/context",
              "minista/head",
            ]),
          },
        }
      }
      if (isDev) {
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
        await prepareClientPages()

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
    configEnvironment(name, config) {
      if (!isAppBuild) return
      if (name === appEnvironmentNames?.renderName) {
        return {
          build: {
            rolldownOptions: {
              external: mergeRolldownExternal(
                config.build?.rolldownOptions?.external,
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
        }
      }
      if (name === appEnvironmentNames?.clientName) {
        return {
          build: {
            rolldownOptions: {
              input: { [tempName]: throughFile },
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
        return `export default ${JSON.stringify(ssgPages)};`
      }
      return null
    },
    configureServer(server) {
      return () => {
        const evaluator = new ViteDevModuleEvaluator(server)

        async function loadDevPages() {
          /** @type {{LAYOUTS?: ImportedLayouts, PAGES?: ImportedPages}} */
          const modules = await evaluator.importModule(globFile)
          const { LAYOUTS = {}, PAGES = {} } = modules
          const formatedLayout = formatLayout(LAYOUTS)
          const resolvedLayout = await resolveLayout(formatedLayout)
          const project = await resolveLegacySsgProject(PAGES, opts)
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

          await selfUpdateResolvedToSsgPages(resolvedLayout, resolvedPages)
          evaluator.invalidateModule(SSG_PAGES_VIRTUAL)
          return { resolvedLayout, resolvedPages }
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
            const { resolvedLayout, resolvedPages } = await devPageCache.get(
              loadDevPages,
            )
            const resolvedPage = resolvedPages.find((page) => page.url === url)

            let html = ""

            if (resolvedPage) {
              html =
                ssgPages.find((page) => page.url === resolvedPage.url)?.html ??
                (await transformHtml({ resolvedLayout, resolvedPage }, renderer))
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
          isReachableFromGlob(m, globFile, SSG_PAGES_VIRTUAL),
        )

        updates.invalidateModuleById(
          this.environment.name,
          SSG_PAGES_VIRTUAL,
          timestamp,
          true,
        )

        if (touchSsrHtml) {
          devPageCache.invalidate()
          const rel = modules[0]?.id
            ? stripQuery(path.relative(server.config.root, modules[0].id))
            : ""
          server.config.logger.info(
            [pc.dim("(ssr)"), pc.green("page reload"), pc.dim(rel)]
              .filter(Boolean)
              .join(" "),
            { timestamp: true, clear: false },
          )
          updates.fullReload()
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
          devPageCache.invalidate()
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
      if (isSsr || this.environment.name === appEnvironmentNames?.renderName) {
        return
      }
      if (!ssgPages.length) return

      await Promise.all(
        ssgPages.map((ssgPage) => {
          this.emitFile({
            type: "asset",
            source: ssgPage.html,
            fileName: ssgPage.fileName,
          })
        }),
      )
    },
    generateBundle(options, bundle) {
      if (isSsr || this.environment.name === appEnvironmentNames?.renderName) {
        return
      }

      for (const [key, item] of Object.entries(bundle)) {
        if (item.name === tempName && item.type === "chunk") {
          delete bundle[key]
          break
        }
      }
    },
  }
}
