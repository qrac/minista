import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { ResolvedConfig } from "../config/index.js"
import type { GetSources } from "../server/sources.js"
import { renderApp } from "../server/app.js"
import { transformEntryTags } from "../transform/tags.js"
import { transformComment } from "../transform/comment.js"
import { transformMarkdown } from "../transform/markdown.js"
import { resolveBase } from "../utility/base.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginServe(config: ResolvedConfig): Plugin {
  return {
    name: "minista-vite-plugin:serve",
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res) => {
          try {
            if (req.url?.endsWith(".html")) {
              //const originalUrl = req.originalUrl || ""
              const url = req.url
                .replace(/index\.html$/, "")
                .replace(/\.html$/, "")

              const { getSources } = (await server.ssrLoadModule(
                __dirname + "/../server/sources.js"
              )) as { getSources: GetSources }
              const { resolvedGlobal, resolvedPages } = await getSources()

              const { headTags, startTags, endTags } = transformEntryTags({
                mode: "serve",
                pathname: url,
                config,
              })

              let html = renderApp({
                url,
                resolvedGlobal,
                resolvedPages,
                headTags,
                startTags,
                endTags,
              })

              if (html.includes(`data-minista-transform-target="comment"`)) {
                html = transformComment(html)
              }
              if (html.includes(`data-minista-transform-target="markdown"`)) {
                html = await transformMarkdown(html, config.mdx)
              }

              let transformedHtml = await server.transformIndexHtml(url, html)

              const resolvedBase = resolveBase(config.main.base)

              if (resolvedBase.match(/^\/.*\/$/)) {
                const wrongBase = path.join(resolvedBase, resolvedBase)
                const wrongSrc = `src="${wrongBase}`
                const resolvedSrc = `src="${resolvedBase}`
                const reg = new RegExp(wrongSrc, "g")

                transformedHtml = transformedHtml.replace(reg, resolvedSrc)
              }

              res.statusCode = 200
              res.end(transformedHtml)
            }
          } catch (e: any) {
            server.ssrFixStacktrace(e)
            console.error(e)

            res.statusCode = 500
            res.end(e.message)
          }
        })
      }
    },
  }
}
