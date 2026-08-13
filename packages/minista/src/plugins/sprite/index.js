/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('vite').ViteDevServer} ViteDevServer */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */

import fs from "node:fs"
import path from "node:path"
import { normalizePath } from "vite"

import { NodeHtmlDocumentFactory } from "../../adapters/html/index.js"
import { NodeSpriteBuilder } from "../../adapters/sprite/index.js"
import { isViteAppClientEnvironment } from "../../adapters/vite/app-config.js"
import { ViteDevUpdateAdapter } from "../../adapters/vite/dev-update.js"
import { createNodeId } from "../../core/graph/index.js"
import {
  collectSpriteReferences,
  composeSpriteDocument,
  createSpriteArtifactId,
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

  let isDev = false
  let isSsr = false
  let isBuild = false
  let base = "/"
  let rootDir = ""
  let spriteDir = ""
  /** @type {NodeSpriteBuilder | undefined} */
  let builder
  /** @type {Set<string>} */
  const watchDirectories = new Set()
  /** @type {ViteDevServer | undefined} */
  let viteServer
  const devPageIndex = new DevSpritePageIndex()
  /** @type {import("../../core/graph/index.js").OutputClaim[]} */
  let outputClaims = []

  /** @param {string} sourceDirectory */
  async function writeDevSprite(sourceDirectory) {
    if (!builder) return
    const name = path.basename(sourceDirectory)
    const sprite = await builder.build(sourceDirectory)
    await fs.promises.writeFile(
      path.resolve(spriteDir, `${name}.svg`),
      sprite,
      "utf8",
    )
  }

  return {
    name: "vite-plugin:minista-sprite",
    api: { minista: { outputClaims: () => outputClaims, feature: { id: "sprite", apiVersion: 1, options: opts, provides: ["sprite-assets"], requires: ["html-documents"] } } },
    enforce: "pre",
    apply(_, { command, isSsrBuild }) {
      isDev = command === "serve"
      isSsr = command === "build" && Boolean(isSsrBuild)
      isBuild = command === "build" && !isSsrBuild
      return isDev || isBuild
    },
    applyToEnvironment: isViteAppClientEnvironment,
    async config(config) {
      rootDir = getRootDir(cwd, config.root || "")
      builder = new NodeSpriteBuilder(rootDir, opts.config)

      if (isDev) {
        base = getServeBase(config.base || base)
        spriteDir = path.resolve(getTempDir(cwd, rootDir), "sprite")
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
      }
      if (isBuild) base = getBuildBase(config.base || base)
    },
    configureServer(server) {
      viteServer = server
      const updates = new ViteDevUpdateAdapter(server)
      server.watcher.on("all", async (event, filePath) => {
        if (!filePath.endsWith(".svg")) return
        if (!["add", "change", "unlink"].includes(event)) return
        const targetDirectory = path.dirname(filePath)
        if (!watchDirectories.has(targetDirectory)) return
        const sourceDirectory = normalizePath(
          path.relative(rootDir, targetDirectory),
        )
        await writeDevSprite(sourceDirectory)
        const pages = devPageIndex.getPages(sourceDirectory)
        if (pages.length > 0) updates.reloadPages(pages)
        else updates.fullReload()
      })
    },
    async transformIndexHtml(html, context) {
      if (!builder) return html
      const document = documents.parse({
        pageId: createNodeId("page", "legacy-sprite", context.path),
        html,
      })
      const references = collectSpriteReferences(document)
      const sourceDirectories = [
        ...new Set(references.map(({ sourceDirectory }) => sourceDirectory)),
      ]
      if (isDev) devPageIndex.replacePage(context.path, sourceDirectories)
      if (references.length === 0) return html
      for (const sourceDirectory of sourceDirectories) {
        const watchDirectory = path.resolve(rootDir, sourceDirectory)
        if (!watchDirectories.has(watchDirectory)) {
          await writeDevSprite(sourceDirectory)
          watchDirectories.add(watchDirectory)
          viteServer?.watcher.add(watchDirectory)
        }
      }
      const timestamp = Date.now()
      const prefixBase = base.replace(/\/$/, "")
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
      if (!builder) return
      outputClaims = []
      const htmlItems = Object.values(filterOutputAssets(bundle)).filter((item) =>
        item.fileName.endsWith(".html"),
      )
      const pages = htmlItems.map((item) => {
        const document = documents.parse({
          pageId: createNodeId("page", "legacy-sprite", item.fileName),
          html: String(item.source),
        })
        return { item, document, references: collectSpriteReferences(document) }
      })
      const sourceDirectories = [
        ...new Set(
          pages.flatMap(({ references }) =>
            references.map(({ sourceDirectory }) => sourceDirectory),
          ),
        ),
      ].sort()
      const outputByArtifact = new Map()
      for (const sourceDirectory of sourceDirectories) {
        const referenceId = this.emitFile({
          type: "asset",
          name: `${path.basename(sourceDirectory)}.svg`,
          source: await builder.build(sourceDirectory),
        })
        outputByArtifact.set(
          createSpriteArtifactId(sourceDirectory),
          this.getFileName(referenceId),
        )
        outputClaims.push(Object.freeze({
          id: createSpriteArtifactId(sourceDirectory),
          kind: "sprite",
          owner: createNodeId("feature", "sprite"),
          source: sourceDirectory,
          fileName: this.getFileName(referenceId),
          pageUrls: Object.freeze(pages
            .filter(({ references }) => references.some(
              (reference) =>
                reference.sourceDirectory === sourceDirectory,
            ))
            .map(({ item }) => getHtmlPageUrl(item.fileName))),
          dependencies: Object.freeze([]),
        }))
      }
      for (const { item, document, references } of pages) {
        if (references.length === 0) continue
        composeSpriteDocument(document, {
          resolve: (artifactId) => {
            const fileName = outputByArtifact.get(artifactId)
            return fileName
              ? getBasedAssetUrl(base, item.fileName, fileName)
              : undefined
          },
        })
        item.source = document.serialize()
      }
    },
  }
}
