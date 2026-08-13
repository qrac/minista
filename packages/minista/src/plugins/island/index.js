/** @typedef {import('vite').Plugin} Plugin */
/** @typedef {import('./types').PluginOptions} PluginOptions */
/** @typedef {import('./types').UserPluginOptions} UserPluginOptions */
/** @typedef {import('../ssg/types').SsgPage} SsgPage */
/** @typedef {import('../../adapters/vite/environment-preparation.js').ViteEnvironmentPreparation} ViteEnvironmentPreparation */

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "url"
import { glob } from "tinyglobby"
import { normalizePath } from "vite"

import { NodeHtmlDocumentFactory } from "../../adapters/html/index.js"
import {
  NodeIslandEntryGenerator,
  SwcIslandSourceTransformer,
} from "../../adapters/island/index.js"
import { getViteBuildSession } from "../../adapters/vite/build-session.js"
import { ViteDevModuleEvaluator } from "../../adapters/vite/dev-module-evaluator.js"
import { getViteAppEnvironmentNames } from "../../adapters/vite/app-config.js"
import { ViteEnvironmentInputAdapter } from "../../adapters/vite/environment-input.js"
import { createNodeId } from "../../core/graph/index.js"
import {
  collectIslandReferences,
  composeIslandDocument,
  createIslandSnippetsArtifactId,
  createIslandSourcePlan,
} from "../../features/island/index.js"
import { createRenderedPagesArtifactId } from "../../features/ssg/index.js"
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
const documents = new NodeHtmlDocumentFactory()
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
  let snippetsFile = ""
  /** @type {string[]} */
  let snippetList = []
  /** @type {Set<string>} */
  let uniqueSnippets = new Set()
  /** @type {ViteDevModuleEvaluator | undefined} */
  let moduleEvaluator
  let ssgDir = ""
  /** @type {SsgPage[]} */
  let ssgPages = []
  /** @type {{[pathId: string]: string}} */
  let entries = {}
  /** @type {import("../../features/island/index.js").IslandSourcePlan | undefined} */
  let sourcePlan
  /** @type {import("../../core/graph/index.js").OutputClaim[]} */
  let outputClaims = []
  /** @type {import("../../adapters/vite/build-session.js").ViteBuildSession | undefined} */
  let buildSession
  const environmentInput = new ViteEnvironmentInputAdapter()

  async function prepareIslandEntries() {
    entries = {}
    sourcePlan = undefined
    outputClaims = []
    const snippetArtifact = buildSession
      ? await buildSession.artifacts.get(createIslandSnippetsArtifactId())
      : undefined
    if (snippetArtifact) {
      snippetList = JSON.parse(String(snippetArtifact.content))
    } else {
      if (!fs.existsSync(snippetsFile)) return
      const snippetsFileUrl = pathToFileURL(snippetsFile).href
      /** @type {{ssrSnippetList: string[]}} */
      const { ssrSnippetList } = await import(snippetsFileUrl)
      snippetList = ssrSnippetList
    }
    if (!snippetList || snippetList.length === 0) return

    const renderedPages = buildSession
      ? await buildSession.artifacts.get(createRenderedPagesArtifactId())
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

    if (!ssgPages.length) return
    const references = ssgPages.flatMap((page) =>
      collectIslandReferences(
        documents.parse({
          pageId: createNodeId("page", "legacy-island", page.fileName),
          html: page.html,
        }),
        opts,
      ),
    )
    references.sort(
      (left, right) =>
        snippetList.indexOf(left.snippet) - snippetList.indexOf(right.snippet),
    )
    sourcePlan = await createIslandSourcePlan(references, opts, entryGenerator)
    await Promise.all(
      sourcePlan.snippets.map(async (snippet) => {
        const fullPath = path.resolve(
          snippetsDir,
          `snippet-${snippet.index}.tsx`,
        )
        await fs.promises.writeFile(fullPath, snippet.code, "utf8")
      }),
    )
    await Promise.all(
      sourcePlan.entries.map(async (entry) => {
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
        snippetsFile = path.resolve(islandDir, `${tempName}-snippets.mjs`)
        ssgDir = path.resolve(tempDir, "ssg")

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
        /** @type {{default?: SsgPage[]}} */
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
    generateBundle(_options, bundle) {
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
      const pages = htmlItems.map((item) => {
        const document = documents.parse({
          pageId: createNodeId("page", "legacy-island", item.fileName),
          html: String(item.source),
        })
        return {
          item,
          document,
          patternIndex: activeSourcePlan.pagePatterns[document.pageId],
        }
      })
      /** @type {Map<string, Set<string>>} */
      const cssPageUrls = new Map()
      for (const output of bundleOutputs) {
        const pageUrls = pages
          .filter(({ patternIndex }) => patternIndex === output.patternIndex)
          .map(({ item }) => getHtmlPageUrl(item.fileName))
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

      for (const { item, document } of pages) {
        composeIslandDocument(
          document,
          activeSourcePlan,
          bundleOutputs,
          opts,
          {
            resolve: (fileName) =>
              getBasedAssetUrl(base, item.fileName, fileName),
          },
        )
        item.source = document.serialize()
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
        const code = `export const ssrSnippetList = ${JSON.stringify(
          snippetList,
        )}`
        await fs.promises.writeFile(snippetsFile, code, "utf8")
      }
    },
  }
}
