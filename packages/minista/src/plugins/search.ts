import type { Plugin, ViteDevServer } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"

import type { ResolvedConfig } from "../config/index.js"
import type { GetSources } from "../server/sources.js"
import { renderApp } from "../server/app.js"
import { transformEntryTags } from "../transform/tags.js"
import { transformComment } from "../transform/comment.js"
import { transformMarkdown } from "../transform/markdown.js"
import { transformSearch } from "../transform/search.js"
import { getHtmlPath } from "../utility/path.js"
import { resolveBase } from "../utility/base.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginSearch(config: ResolvedConfig): Plugin {
  let command: "build" | "serve"
  let server: ViteDevServer
  let activeSearch = false
  let useCache = false

  const resolvedBase = resolveBase(config.main.base)
  const output = path.join(config.sub.tempDir, "__minista_plugin_search.json")

  return {
    name: "minista-vite-plugin:search",
    async config(_, viteConfig) {
      command = viteConfig.command
      activeSearch = config.main.search.useJson
      useCache = config.main.search.cache && fs.existsSync(output)

      if (activeSearch) {
        return {
          resolve: {
            alias: [
              {
                find: "/@minista-temp/__minista_plugin_search.json",
                replacement: output,
              },
            ],
          },
        }
      }
    },
    configureServer(_server) {
      server = _server
    },
    async buildStart() {
      if (command === "build") {
        await fs.remove(output)
      }
      if (command === "serve" && activeSearch && !useCache) {
        await fs.remove(output)

        const { getSources } = (await server.ssrLoadModule(
          __dirname + "/../server/sources.js"
        )) as { getSources: GetSources }
        const { resolvedGlobal, resolvedPages } = await getSources()

        let htmlPages = resolvedPages.map((page) => {
          const basedPath = resolvedBase.match(/^\/.*\/$/)
            ? path.join(resolvedBase, page.path)
            : page.path
          const { headTags, startTags, endTags } = transformEntryTags({
            mode: "ssg",
            pathname: basedPath,
            config,
          })
          const draft = page.frontmatter?.draft || false
          return {
            path: page.path,
            basedPath,
            html: draft
              ? ""
              : renderApp({
                  url: page.path,
                  resolvedGlobal,
                  resolvedPages: [page],
                  headTags,
                  startTags,
                  endTags,
                }),
          }
        })

        htmlPages = htmlPages.filter((page) => page.html)

        htmlPages = await Promise.all(
          htmlPages.map(async (page) => {
            let html = page.html

            if (html.includes(`data-minista-transform-target="comment"`)) {
              html = transformComment(html)
            }
            if (html.includes(`data-minista-transform-target="markdown"`)) {
              html = await transformMarkdown(html, config.mdx)
            }
            return {
              path: page.path,
              basedPath: page.basedPath,
              html,
            }
          })
        )

        let ssgPages = htmlPages.map((page) => {
          const fileName = getHtmlPath(page.path)
          return {
            fileName,
            path: page.basedPath,
            html: page.html,
          }
        })

        const searchObj = await transformSearch({ ssgPages, config })

        return await fs.outputJson(output, searchObj).catch((err) => {
          console.error(err)
        })
      }
    },
    transform(code, id) {
      if (
        command === "build" &&
        activeSearch &&
        id.match(/minista(\/|\\)dist(\/|\\)shared(\/|\\)search\.js$/)
      ) {
        let filePath = path.join(
          config.main.search.outDir,
          config.main.search.outName + ".json"
        )
        filePath = resolvedBase.match(/^\/.*\/$/)
          ? path.join(resolvedBase, filePath)
          : path.join("/", filePath)

        const replacedCode = code.replace(
          /\/@minista-temp\/__minista_plugin_search\.json/,
          filePath
        )
        return {
          code: replacedCode,
          map: null,
        }
      }
    },
  }
}
