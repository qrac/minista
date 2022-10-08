import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"
import pc from "picocolors"
import { createServer as createViteServer } from "vite"
import beautify from "js-beautify"

import type { ResolvedConfig, InlineConfig } from "../config/index.js"
import type { GetSources } from "../server/sources.js"
import { resolveConfig } from "../config/index.js"
import { compileApp } from "../compile/app.js"
import { compileComment } from "../compile/comment.js"
import { compileMarkdown } from "../compile/markdown.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function doBuild(config: ResolvedConfig) {
  const server = await createViteServer(config.vite)
  await server.listen()

  const { getSources } = (await server.ssrLoadModule(
    __dirname + "/../server/sources.js"
  )) as { getSources: GetSources }
  const { resolvedGlobal, resolvedPages } = await getSources()

  await server.close()

  if (resolvedPages.length === 0) {
    return
  }

  let htmlPages = resolvedPages.map((page) => {
    return {
      path: page.path,
      html: compileApp({
        url: page.path,
        resolvedGlobal,
        resolvedPages: [page],
        useDevelopBundle: false,
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

  htmlPages = config.main.beautify.useHtml
    ? htmlPages.map((page) => ({
        path: page.path,
        html: beautify.html(page.html, config.main.beautify.htmlOptions),
      }))
    : htmlPages

  await Promise.all(
    htmlPages.map(async (page) => {
      const fileName = page.path.endsWith("/")
        ? path.join(page.path, "index.html")
        : page.path + ".html"
      const routePath = path.join(
        config.sub.resolvedRoot,
        config.main.out,
        fileName
      )
      const relativeParh = path.relative(process.cwd(), routePath)

      return await fs
        .outputFile(routePath, page.html)
        .then(() => {
          console.log(`${pc.bold(pc.green("BUILD"))} ${pc.bold(relativeParh)}`)
        })
        .catch((err) => {
          console.error(err)
        })
    })
  )
}

export async function build(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)
  await doBuild(config)
}
