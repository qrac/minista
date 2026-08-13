/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import fs from "node:fs"
import path from "node:path"
import { normalizePath } from "vite"

import { NodeHtmlDocumentFactory } from "../../adapters/html/index.js"
import { NodeSpriteBuilder } from "../../adapters/sprite/index.js"
import { isViteAppClientEnvironment } from "../../adapters/vite/app-config.js"
import { processViteDocuments } from "../../adapters/vite/compatibility-lifecycle.js"
import { ViteEnvironmentState } from "../../adapters/vite/environment-state.js"
import { ViteDevUpdateAdapter } from "../../adapters/vite/dev-update.js"
import { ViteDevServerRegistry } from "../../adapters/vite/dev-server-registry.js"
import { createNodeId } from "../../core/graph/index.js"
import {
  collectSpriteReferences,
  composeSpriteDocument,
  createSpriteArtifactId,
  createSpriteFeature,
  DevSpritePageIndex,
} from "../../features/sprite/index.js"
import { mergeObj } from "../../shared/obj.js"
import { getRootDir, getTempDir } from "../../shared/path.js"
import { getHtmlPageUrl } from "../../shared/filename.js"
import {
  getBasedAssetUrl,
  getBuildBase,
  getServeBase,
} from "../../shared/url.js"
import { filterOutputAssets, mergeAlias } from "../../shared/vite.js"

/** @type {PluginOptions} */
const defaultOptions = {}
const documents = new NodeHtmlDocumentFactory()

/**
 * @param {UserPluginOptions} uOpts
 * @returns {Plugin}
 */
export function pluginSprite(uOpts = {}) {
  /** @type {PluginOptions} */
  const opts = mergeObj(defaultOptions, uOpts)
  const cwd = process.cwd()
  const spriteAlias = "/@__minista-sprite"

  const devStates = new ViteEnvironmentState(() => ({
    rootDir: "",
    spriteDir: "",
    base: "/",
    /** @type {NodeSpriteBuilder | undefined} */
    builder: undefined,
    watchDirectories: /** @type {Set<string>} */ (new Set()),
    pageIndex: new DevSpritePageIndex(),
  }))
  const devServers = new ViteDevServerRegistry()
  const claimStates = new ViteEnvironmentState(() => ({
    claims: /** @type {import("../../core/graph/index.js").OutputClaim[]} */ ([]),
  }))

  /** @param {import("vite").ViteDevServer} server */
  function getDevState(server) {
    const state = devStates.get(server)
    if (!state.builder) {
      state.rootDir = getRootDir(cwd, server.config.root || "")
      state.spriteDir = path.resolve(getTempDir(cwd, state.rootDir), "sprite")
      state.base = getServeBase(server.config.base || "/")
      state.builder = new NodeSpriteBuilder(state.rootDir, opts.config)
    }
    return state
  }

  /** @param {ReturnType<typeof getDevState>} state @param {string} sourceDirectory */
  async function writeDevSprite(state, sourceDirectory) {
    if (!state.builder) return
    const name = path.basename(sourceDirectory)
    const sprite = await state.builder.build(sourceDirectory)
    await fs.promises.writeFile(
      path.resolve(state.spriteDir, `${name}.svg`),
      sprite,
      "utf8",
    )
  }

  return {
    name: "vite-plugin:minista-sprite",
    api: { minista: { outputClaims: /** @param {import("vite").Environment | undefined} environment */ (environment) => claimStates.get(environment).claims, feature: { id: "sprite", apiVersion: 1, options: opts, provides: ["sprite-assets"], requires: ["html-documents"] } } },
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      return command === "serve" || (command === "build" && !isSsrBuild)
    },
    applyToEnvironment: isViteAppClientEnvironment,
    async config(config, { command }) {
      if (command !== "serve") return
      const rootDir = getRootDir(cwd, config.root || "")
      const spriteDir = path.resolve(getTempDir(cwd, rootDir), "sprite")
      await fs.promises.mkdir(spriteDir, { recursive: true })
      return {
        resolve: {
          alias: mergeAlias(config, [
            {
              find: spriteAlias,
              replacement: normalizePath(spriteDir),
            },
          ]),
        },
      }
    },
    async configureServer(server) {
      devServers.add(server)
      server.httpServer?.once("close", () => devServers.delete(server))
      const state = getDevState(server)
      await fs.promises.mkdir(state.spriteDir, { recursive: true })
      const updates = new ViteDevUpdateAdapter(server)
      server.watcher.on("all", async (event, filePath) => {
        if (!filePath.endsWith(".svg")) return
        if (!["add", "change", "unlink"].includes(event)) return
        const targetDirectory = path.dirname(filePath)
        if (!state.watchDirectories.has(targetDirectory)) return
        const sourceDirectory = normalizePath(
          path.relative(state.rootDir, targetDirectory),
        )
        await writeDevSprite(state, sourceDirectory)
        const pages = state.pageIndex.getPages(sourceDirectory)
        if (pages.length > 0) updates.reloadPages(pages)
        else updates.fullReload()
      })
    },
    async transformIndexHtml(html, context) {
      const server = devServers.resolve(context)
      if (!server) return html
      const state = getDevState(server)
      const document = documents.parse({
        pageId: createNodeId("page", "legacy-sprite", context.path),
        html,
      })
      const references = collectSpriteReferences(document)
      const sourceDirectories = [
        ...new Set(references.map(({ sourceDirectory }) => sourceDirectory)),
      ]
      state.pageIndex.replacePage(context.path, sourceDirectories)
      if (references.length === 0) return html
      for (const sourceDirectory of sourceDirectories) {
        const watchDirectory = path.resolve(state.rootDir, sourceDirectory)
        if (!state.watchDirectories.has(watchDirectory)) {
          await writeDevSprite(state, sourceDirectory)
          state.watchDirectories.add(watchDirectory)
          server.watcher.add(watchDirectory)
        }
      }
      const timestamp = Date.now()
      const prefixBase = state.base.replace(/\/$/, "")
      const outputByArtifact = new Map(
        sourceDirectories.map((sourceDirectory) => [
          createSpriteArtifactId(sourceDirectory),
          `${prefixBase}${spriteAlias}/${path.basename(sourceDirectory)}.svg?t=${timestamp}`,
        ]),
      )
      composeSpriteDocument(document, {
        resolve: (artifactId) => outputByArtifact.get(artifactId),
      })
      return document.serialize()
    },
    async generateBundle(options, bundle) {
      const rootDir = getRootDir(cwd, this.environment.config.root || "")
      const base = getBuildBase(this.environment.config.base || "/")
      const builder = new NodeSpriteBuilder(rootDir, opts.config)
      const outputClaims = claimStates.get(this.environment).claims
      outputClaims.length = 0
      const htmlItems = Object.values(filterOutputAssets(bundle)).filter((item) =>
        item.fileName.endsWith(".html"),
      )
      const pages = htmlItems.map((item) => ({
        item,
        fileName: item.fileName,
        url: getHtmlPageUrl(item.fileName),
        html: String(item.source),
      }))
      const outputByArtifact = new Map()
      const pageFileNames = new Map()
      const feature = createSpriteFeature(opts, builder, {
        resolve(artifactId, pageId) {
          const fileName = outputByArtifact.get(artifactId)
          const pageFileName = pageFileNames.get(pageId)
          return fileName && pageFileName
            ? getBasedAssetUrl(base, pageFileName, fileName)
            : undefined
        },
      })
      const result = await processViteDocuments(
        pages.map(({ fileName, url, html }) => ({ fileName, url, html })),
        [feature],
        undefined,
        {
          beforeCompose: async ({ artifacts, graph }) => {
            for (const page of graph.pages.values()) {
              const route = graph.routes.get(page.routeId)
              if (route) pageFileNames.set(page.id, route.pageModuleId)
            }
            /** @type {import("../../features/sprite/index.js").SpriteReference[]} */
            const references = artifacts
              .filter((record) =>
                record.owner === feature.id &&
                record.mediaType ===
                  "application/vnd.minista.sprite-references+json"
              )
              .flatMap((record) => JSON.parse(String(record.content)))
            for (const artifact of artifacts.filter(
              (record) =>
                record.owner === feature.id &&
                record.mediaType === "image/svg+xml",
            )) {
              const sourceDirectory = graph.artifacts.get(artifact.id)?.source
              if (!sourceDirectory) continue
              const referenceId = this.emitFile({
                type: "asset",
                name: `${path.basename(sourceDirectory)}.svg`,
                source: artifact.content,
              })
              const fileName = this.getFileName(referenceId)
              outputByArtifact.set(artifact.id, fileName)
              outputClaims.push(Object.freeze({
                id: artifact.id,
                kind: "sprite",
                owner: feature.id,
                source: sourceDirectory,
                fileName,
                pageUrls: Object.freeze([
                  ...new Set(references
                    .filter((reference) =>
                      reference.sourceDirectory === sourceDirectory
                    )
                    .map((reference) => graph.pages.get(reference.pageId)?.url)
                    .filter((url) => url !== undefined)),
                ]),
                dependencies: Object.freeze([]),
              }))
            }
          },
        },
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
