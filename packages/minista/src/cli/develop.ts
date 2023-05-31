import type { Plugin, ViteDevServer } from "vite"
import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  createServer as createViteServer,
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
} from "vite"
import { parse as parseHtml } from "node-html-parser"

import type { InlineConfig, ResolvedConfig } from "../config/index.js"
import type { GetSources } from "../server/source.js"
import type { SsgPages } from "../transform/ssg.js"
import { resolveConfig } from "../config/index.js"
import { pluginReact } from "../plugins/react.js"
import { pluginPreact } from "../plugins/preact.js"
import { pluginMdx } from "../plugins/mdx.js"
import { pluginImage } from "../plugins/image.js"
import { pluginSvgr } from "../plugins/svgr.js"
import { pluginIcon } from "../plugins/icon.js"
import { pluginFetch } from "../plugins/fetch.js"
import { pluginPartial } from "../plugins/partial.js"
import { pluginSearch } from "../plugins/search.js"
import { transformPage } from "../transform/page.js"
import { transformSsg } from "../transform/ssg.js"
import { transformTags } from "../transform/tag.js"
import { transformComments } from "../transform/comment.js"
import { transformDeliveries } from "../transform/delivery.js"
import { transformArchives } from "../transform/archive.js"
import { transformRemotes } from "../transform/remote.js"
import { transformImages } from "../transform/image.js"
import { transformIcons } from "../transform/icon.js"
import { transformEncode } from "../transform/encode.js"
import { transformSearch } from "../transform/search.js"
import { generateTempSearch } from "../generate/search.js"
import { hasElement } from "../utility/element.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function develop(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  const mergedViteConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      plugins: [
        pluginDevelop(config),
        pluginReact(),
        pluginPreact(config),
        pluginMdx(config),
        pluginImage(config),
        pluginSvgr(config),
        pluginIcon(config),
        pluginFetch(config),
        pluginPartial(config),
        pluginSearch(config),
      ],
    })
  )
  const viteServer = await createViteServer(mergedViteConfig)

  await viteServer.listen()
  viteServer.printUrls()
}

function pluginDevelop(config: ResolvedConfig): Plugin {
  let server: ViteDevServer
  let ssgPages: SsgPages = []

  return {
    name: "minista-vite-plugin:develop",
    configureServer(_server) {
      server = _server

      return () => {
        server.middlewares.use(async (req, res, next) => {
          try {
            const { resolvedBase } = config.sub

            let originalUrl = req.originalUrl || ""
            let url = originalUrl

            if (resolvedBase.match(/^\/.*\/$/)) {
              const reg = new RegExp(`^${resolvedBase}`)
              url = url.replace(reg, "/")
            }

            const { getSources } = (await server.ssrLoadModule(
              __dirname + "/../server/source.js"
            )) as { getSources: GetSources }
            const { resolvedGlobal, resolvedPages } = await getSources()

            const { headTags, startTags, endTags } = transformTags({
              command: "serve",
              pathname: url,
              config,
            })

            let html = transformPage({
              url,
              resolvedGlobal,
              resolvedPages,
              headTags,
              startTags,
              endTags,
            })

            let parsedHtml = parseHtml(html, { comment: true }) as NHTMLElement

            const charsetEl = parsedHtml.querySelector(`meta[charset]`)
            const charset = charsetEl?.getAttribute("charset") || "UTF-8"

            const searchAttr = `[data-full-text-search]`
            const deliveryAttr = `[data-minista-transform-target="delivery"]`
            const hasSearch = hasElement(parsedHtml, searchAttr)
            const hasDelivery = hasElement(parsedHtml, deliveryAttr)

            if (hasSearch || hasDelivery) {
              ssgPages = await transformSsg({
                command: "serve",
                resolvedGlobal,
                resolvedPages,
                config,
              })
            }
            if (hasSearch) {
              const searchObj = await transformSearch({
                command: "serve",
                ssgPages,
                config,
              })
              const data = JSON.stringify(searchObj)
              await generateTempSearch({ data, config })
            }
            transformComments(parsedHtml)
            transformDeliveries({ parsedData: parsedHtml, ssgPages, config })
            transformArchives({ parsedData: parsedHtml, config })

            await transformRemotes({
              command: "serve",
              parsedData: parsedHtml,
              config,
            })
            await transformImages({
              command: "serve",
              parsedData: parsedHtml,
              config,
            })
            await transformIcons({
              command: "serve",
              parsedData: parsedHtml,
              config,
              server,
            })

            html = parsedHtml.toString()
            html = await server.transformIndexHtml(originalUrl, html)

            if (charset.match(/^utf[\s-_]*8$/i)) {
              res.statusCode = 200
              res.end(html)
            } else {
              res.statusCode = 200
              res.end(transformEncode(html, charset))
            }
          } catch (e: any) {
            server.ssrFixStacktrace(e)
            next(e)
          }
        })
      }
    },
  }
}
