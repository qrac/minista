import type { ViteDevServer } from "vite"
import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"
import fs from "fs-extra"

import type { ResolvedConfig } from "../config/index.js"
import type { CreateSprites } from "../generate/sprite.js"
import { syncTempSprite } from "../server/sprite.js"
import { resolveBase } from "../utility/base.js"
import { cleanElement } from "../utility/element.js"

const cleanAttributes = [
  "data-minista-transform-target",
  "data-minista-icon-iconid",
  "data-minista-icon-srcdir",
  "data-minista-icon-options",
]

export function getIconAttrs(
  fileName: string,
  iconId: string,
  options?: { add?: string; remove?: string }
) {
  let href = fileName

  options?.add && (href = path.join(options.add, href))
  options?.remove && (href = href.replace(options.remove, ""))

  href = `${href}#${iconId}`
  return { href }
}

async function transformIcon({
  command,
  el,
  config,
  createSprites,
  server,
}: {
  command: "build" | "serve"
  el: NHTMLElement
  config: ResolvedConfig
  createSprites: CreateSprites
  server?: ViteDevServer
}) {
  const { resolvedRoot, tempDir } = config.sub
  const { assets } = config.main
  const resolvedBase = resolveBase(config.main.base)

  const attrSrcDir = el.getAttribute("data-minista-icon-srcdir") || ""
  const attrIconId = el.getAttribute("data-minista-icon-iconid") || ""

  const srcDir = attrSrcDir
    ? path.join(resolvedRoot, attrSrcDir)
    : path.join(resolvedRoot, assets.icons.srcDir)
  const iconId = attrIconId
  const dirName = path.basename(srcDir)
  const outName = assets.icons.outName.replace(/\[dirname\]/, dirName)

  if (!srcDir || !iconId) {
    cleanElement(el, cleanAttributes)
    return
  }

  if (command === "serve") {
    const outDir = path.join(tempDir, "icons", "serve")
    const fileName = path.join(outDir, outName + ".svg")
    const attrs = getIconAttrs(fileName, iconId, { remove: resolvedRoot })

    el.setAttribute("href", attrs.href)

    if (!(await fs.pathExists(fileName)) && server) {
      await syncTempSprite({ fileName, srcDir, config, server })
    }
  }

  if (command === "build") {
    const fileName = path.join(assets.icons.outDir, outName + ".svg")
    const attrs = getIconAttrs(fileName, iconId, { add: resolvedBase })

    el.setAttribute("href", attrs.href)

    if (!Object.hasOwn(createSprites, fileName)) {
      createSprites[fileName] = {
        srcDir,
      }
    }
  }
  cleanElement(el, cleanAttributes)
  return
}

export async function transformIcons({
  command,
  parsedHtml,
  config,
  createSprites,
  server,
}: {
  command: "build" | "serve"
  parsedHtml: NHTMLElement
  config: ResolvedConfig
  createSprites: CreateSprites
  server?: ViteDevServer
}) {
  const icons = parsedHtml.querySelectorAll(
    `[data-minista-transform-target="icon"]`
  )
  await Promise.all(
    icons.map(async (el) => {
      return await transformIcon({ command, el, config, createSprites, server })
    })
  )
  return parsedHtml
}
