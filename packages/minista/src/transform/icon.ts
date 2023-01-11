import type { HTMLElement as NHTMLElement } from "node-html-parser"
import type { SvgstoreAddOptions } from "@qrac/svgstore"
import path from "node:path"
import fs from "fs-extra"
import fg from "fast-glob"
import { watch } from "chokidar"

import type { ResolvedConfig } from "../config/index.js"
import { transformSprite } from "./sprite.js"
import { resolveBase } from "../utility/base.js"
import { cleanElement } from "../utility/element.js"

export type CreateIcons = {
  [key: string]: CreateIcon
}

type CreateIcon = {
  srcDir: string
  options: SvgstoreAddOptions
}

const cleanAttributes = [
  "data-minista-transform-target",
  "data-minista-icon-iconid",
  "data-minista-icon-srcdir",
  "data-minista-icon-options",
]

export function resolveIconAttrs({
  fileName,
  iconId,
  addHref,
  removeHref,
}: {
  fileName: string
  iconId: string
  addHref?: string
  removeHref?: string
}) {
  let href = fileName

  addHref && (href = path.join(addHref, href))
  removeHref && (href = href.replace(removeHref, ""))

  href = `${href}#${iconId}`

  return { href }
}

async function generateTempIcon({
  fileName,
  srcDir,
  options,
}: {
  fileName: string
  srcDir: string
  options: SvgstoreAddOptions
}) {
  const svgFiles = await fg(path.join(srcDir, "**/*.svg"))

  if (!svgFiles.length) {
    return ""
  }
  const data = transformSprite({
    svgFiles,
    options,
  })
  await fs.outputFile(fileName, data).catch((err) => {
    console.error(err)
  })
}

async function transformIcon({
  command,
  el,
  config,
  createIcons,
}: {
  command: "build" | "serve"
  el: NHTMLElement
  config: ResolvedConfig
  createIcons: CreateIcons
}) {
  const { assets } = config.main
  const { resolvedRoot, tempDir } = config.sub
  const resolvedBase = resolveBase(config.main.base)
  const options = assets.icons.svgstoreOptions

  let srcDir = ""
  srcDir = el.getAttribute("data-minista-icon-srcdir") || ""
  srcDir = srcDir ? srcDir : assets.icons.srcDir
  srcDir = path.join(resolvedRoot, srcDir)

  const iconId = el.getAttribute("data-minista-icon-iconid") || ""
  const dirName = path.basename(srcDir)
  const outName = assets.icons.outName.replace(/\[dirname\]/, dirName)

  if (!srcDir || !iconId) {
    cleanElement(el, cleanAttributes)
    return
  }

  if (command === "serve") {
    const outDir = path.join(tempDir, "icons", "serve")
    const fileName = path.join(outDir, outName + ".svg")
    const { href } = resolveIconAttrs({
      fileName,
      iconId,
      removeHref: resolvedRoot,
    })

    await fs.ensureDir(outDir)
    const hasTempFile = fs.existsSync(fileName)

    if (!hasTempFile) {
      await generateTempIcon({ fileName, srcDir, options })

      const watcher = watch(srcDir)

      watcher.on("all", async function (eventName, path) {
        const triggers = ["add", "change", "unlink"]

        if (triggers.includes(eventName) && path.includes(srcDir)) {
          await generateTempIcon({
            fileName,
            srcDir,
            options,
          })
        }
      })
    }

    el.setAttribute("href", href)
  }

  if (command === "build") {
    const fileName = path.join(assets.icons.outDir, outName + ".svg")
    const { href } = resolveIconAttrs({
      fileName,
      iconId,
      addHref: resolvedBase,
    })

    const hasCreateIcon = Object.hasOwn(createIcons, fileName)

    if (!hasCreateIcon) {
      createIcons[fileName] = {
        srcDir,
        options,
      }
    }
    el.setAttribute("href", href)
  }

  cleanElement(el, cleanAttributes)
  return
}

export async function transformIcons({
  command,
  parsedHtml,
  config,
  createIcons,
}: {
  command: "build" | "serve"
  parsedHtml: NHTMLElement
  config: ResolvedConfig
  createIcons: CreateIcons
}) {
  const icons = parsedHtml.querySelectorAll(
    `[data-minista-transform-target="icon"]`
  )
  await Promise.all(
    icons.map(async (el) => {
      return await transformIcon({ command, el, config, createIcons })
    })
  )
  return parsedHtml
}
