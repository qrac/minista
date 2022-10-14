import type { Plugin } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"
import { createServer as createViteServer } from "vite"

import type { ResolvedConfig } from "../config/index.js"
import type { GetSources } from "../server/sources.js"
import type { ResolvedViteEntry } from "../config/vite.js"
import { compileEntryTags } from "../compile/tags.js"
import { compileApp } from "../compile/app.js"
import { compileComment } from "../compile/comment.js"
import { compileMarkdown } from "../compile/markdown.js"
import { getHtmlPath } from "../utility/path.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type ResolvedHtmlPages = {
  fileName: string
  fileId: string
  moduleId: string
  srcId: string
  path: string
  html: string
}[]

export function pluginSsg(config: ResolvedConfig): Plugin {
  let resolvedHtmlPages: ResolvedHtmlPages = []

  return {
    name: "minista-vite-plugin:ssg",
    async config(viteConfig) {
      const viteServer = await createViteServer(config.vite)

      await viteServer.listen()

      const { getSources } = (await viteServer.ssrLoadModule(
        __dirname + "/../server/sources.js"
      )) as { getSources: GetSources }
      const { resolvedGlobal, resolvedPages } = await getSources()

      await viteServer.close()

      if (resolvedPages.length === 0) {
        return
      }

      let htmlPages = resolvedPages.map((page) => {
        const { headTags, startTags, endTags } = compileEntryTags({
          mode: "ssg",
          pathname: page.path,
          config,
        })
        return {
          path: page.path,
          html: compileApp({
            url: page.path,
            resolvedGlobal,
            resolvedPages: [page],
            headTags,
            startTags,
            endTags,
          }),
        }
      })

      htmlPages = await Promise.all(
        htmlPages.map(async (page) => {
          let html = page.html

          if (html.includes(`data-minista-compile-target="comment"`)) {
            html = compileComment(html)
          }
          if (html.includes(`data-minista-compile-target="markdown"`)) {
            html = await compileMarkdown(html, config.mdx)
          }
          return {
            path: page.path,
            html,
          }
        })
      )

      resolvedHtmlPages = htmlPages.map((page, index) => {
        const fileName = getHtmlPath(page.path)
        const fileId = "__minista_bundle_html_" + index
        const moduleId = path.join("src/pages", fileName)
        const srcId = path.join(config.sub.resolvedRoot, "src/pages", fileName)
        return {
          fileName,
          fileId,
          moduleId,
          srcId,
          path: page.path,
          html: page.html,
        }
      })

      await Promise.all(
        resolvedHtmlPages.map(async (page) => {
          return await fs.outputFile(page.srcId, page.html).catch((err) => {
            console.error(err)
          })
        })
      )

      const htmlArrayInputs = resolvedHtmlPages.map((page) => [
        page.fileId,
        page.srcId,
      ])
      const htmlObjectInputs = Object.fromEntries(htmlArrayInputs)
      const assetInputs = viteConfig.build?.rollupOptions?.input || {}

      const mergedInputs = Object.assign(
        assetInputs,
        htmlObjectInputs
      ) as ResolvedViteEntry

      return {
        build: {
          rollupOptions: {
            input: mergedInputs,
          },
        },
      }
    },
    async buildEnd() {
      await Promise.all(
        resolvedHtmlPages.map(async (page) => {
          return await fs.remove(page.srcId)
        })
      )
    },
  }
}
