import type { ViteDevServer } from "vite"
import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"
import fs from "fs-extra"

import type { ResolvedConfig } from "../config/index.js"
import type { CreateSprites } from "../generate/sprite.js"
import { syncTempSprite } from "../server/sprite.js"
import { getElements, cleanElement } from "../utility/element.js"
import { getUniquePaths } from "../utility/path.js"

const cleanAttributes = [
  "data-minista-transform-target",
  "data-minista-icon-iconid",
  "data-minista-icon-srcdir",
]

export function getIconHref(
  fileName: string,
  iconId: string,
  options?: { add?: string; remove?: string }
) {
  let href = fileName

  options?.add && (href = path.join(options.add, href))
  options?.remove && (href = href.replace(options.remove, ""))

  return `${href}#${iconId}`
}

export async function transformIcons({
  command,
  parsedData,
  config,
  createSprites,
  server,
}: {
  command: "build" | "serve"
  parsedData: NHTMLElement | NHTMLElement[]
  config: ResolvedConfig
  createSprites?: CreateSprites
  server?: ViteDevServer
}) {
  const { resolvedRoot, resolvedBase, tempDir } = config.sub
  const { icons } = config.main.assets

  const targetAttr = `[data-minista-transform-target="icon"]`
  const targetEls = getElements(parsedData, targetAttr)

  if (!targetEls.length) {
    return
  }
  const cacheDir = path.join(tempDir, "icons", "serve")

  let cacheData: CreateSprites = {}

  const targetList = targetEls.map((el) => {
    const attrSrcDir = el.getAttribute("data-minista-icon-srcdir") || ""
    const attrIconId = el.getAttribute("data-minista-icon-iconid") || ""
    return {
      el,
      srcDir: attrSrcDir
        ? path.join(resolvedRoot, attrSrcDir)
        : path.join(resolvedRoot, icons.srcDir),
      iconId: attrIconId,
    }
  })
  const targetSrcDirs = getUniquePaths(targetList.map((item) => item.srcDir))

  await Promise.all(
    targetSrcDirs.map(async (srcDir) => {
      const dirName = path.basename(srcDir)
      const outName = icons.outName.replace(/\[dirname\]/, dirName)
      const outDir = command === "serve" ? cacheDir : icons.outDir
      const fileName = path.join(outDir, outName + ".svg")

      cacheData[srcDir] = fileName

      if (command === "serve") {
        if (!(await fs.pathExists(fileName)) && server) {
          await syncTempSprite({ srcDir, fileName, config, server })
        }
      }
      if (command === "build") {
        createSprites && (createSprites[srcDir] = fileName)
      }
      return
    })
  )

  targetList.map((item) => {
    const { el, srcDir, iconId } = item
    const fileName = cacheData[srcDir]
    const hrefOptions =
      command === "serve" ? { remove: resolvedRoot } : { add: resolvedBase }
    const href = getIconHref(fileName, iconId, hrefOptions)

    el.setAttribute("href", href)
    cleanElement(el, cleanAttributes)
    return
  })
}
