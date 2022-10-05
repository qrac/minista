import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  createServer as createViteServer,
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
} from "vite"

import type { Render } from "../server/render"
import type { ResolvedConfig, InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"
import { compileComment } from "../compile/comment.js"
import { compileMarkdown } from "../compile/markdown.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function doDevelop(config: ResolvedConfig): Plugin {
  return {
    name: "minista-vite-plugin:develop",
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res) => {
          try {
            const url = req.originalUrl || ""

            const { render } = (await server.ssrLoadModule(
              __dirname + "/../server/render.js"
            )) as { render: Render }

            let html = await render(url)

            if (html.includes(`data-minista-compile-target="comment"`)) {
              html = compileComment(html)
            }
            if (html.includes(`data-minista-compile-target="markdown"`)) {
              html = await compileMarkdown(html, config.mdx)
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

export async function develop(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)
  const mergedViteConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({ plugins: [doDevelop(config)] })
  )
  const server = await createViteServer(mergedViteConfig)
  await server.listen()
  server.printUrls()
}
