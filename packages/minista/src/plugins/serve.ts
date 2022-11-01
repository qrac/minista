import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { ResolvedConfig } from "../config/index.js"
import type { GetSources } from "../server/sources.js"
import { renderApp } from "../server/app.js"
import { transformEntryTags } from "../transform/tags.js"
import { transformComment } from "../transform/comment.js"
import { transformMarkdown } from "../transform/markdown.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function pluginServe(config: ResolvedConfig): Plugin {
  return {
    name: "minista-vite-plugin:serve",
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res) => {
          try {
            const url = req.originalUrl || ""

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

            const transformedHtml = await server.transformIndexHtml(url, html)

            res.statusCode = 200
            res.end(transformedHtml)
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
