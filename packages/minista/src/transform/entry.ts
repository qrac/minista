import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"
import fs from "fs-extra"
import { normalizePath } from "vite"

import type { ResolvedConfig } from "../config/index.js"
import type { ResolvedViteEntry } from "../config/entry.js"
import { flags } from "../config/system.js"
import { getElements, cleanElement } from "../utility/element.js"
import { getUniquePaths } from "../utility/path.js"

const cleanAttributes = ["data-minista-entry-name", "data-minista-entry-type"]

export function getEntrySrc(el: NHTMLElement) {
  return el.tagName.toLowerCase() === "link"
    ? el.getAttribute("href") || ""
    : el.getAttribute("src") || ""
}

export async function transformEntries({
  parsedData,
  config,
  dynamicEntries,
}: {
  parsedData: NHTMLElement | NHTMLElement[]
  config: ResolvedConfig
  dynamicEntries: ResolvedViteEntry
}) {
  const { resolvedRoot, resolvedBase } = config.sub
  const { assets } = config.main

  const targetLinkAttr = `link[href^="/"]:not([${flags.entried}])`
  const targetScriptAttr = `script[src^="/"]:not([${flags.entried}])`
  const targetAttr = `${targetLinkAttr}, ${targetScriptAttr}`
  const targetEls = getElements(parsedData, targetAttr)

  const entriedLinkAttr = `link[href^="/"][${flags.entried}]`
  const entriedScriptAttr = `script[src^="/"][${flags.entried}]`
  const entriedAttr = `${entriedLinkAttr}, ${entriedScriptAttr}`
  const entriedEls = getElements(parsedData, entriedAttr)
  entriedEls.map((el) => el.removeAttribute(flags.entried))

  if (!targetEls.length) {
    return
  }
  let targetList = targetEls.map((el) => {
    const tagName = el.tagName.toLowerCase()
    const src = getEntrySrc(el)
    const name = el.getAttribute("data-minista-entry-name") || ""
    const type = el.getAttribute("data-minista-entry-type") || ""
    return { el, tagName, src, name, type }
  })

  let targetSrcs = getUniquePaths(targetList.map((item) => item.src))

  targetSrcs = await Promise.all(
    targetSrcs.map(async (src) => {
      if (await fs.pathExists(path.join(resolvedRoot, src))) {
        return src
      } else {
        return ""
      }
    })
  )
  targetSrcs = targetSrcs.filter((src) => src)

  if (!targetSrcs.length) {
    return
  }
  targetList = targetList.filter((item) => targetSrcs.includes(item.src))

  let linkEntries: ResolvedViteEntry = {}
  let scriptEntries: ResolvedViteEntry = {}

  targetList.map((item) => {
    const { tagName, el } = item

    const isScript = tagName === "script"
    const srcAttr = isScript ? "src" : "href"
    const outExt = isScript ? "js" : "css"

    const src = path.join(resolvedRoot, item.src)
    const name = item.name ? item.name : path.parse(src).name
    const outDir = assets.outDir
    const outName = assets.outName.replace(/\[name\]/, name)
    const assetPath = normalizePath(
      path.join(resolvedBase, outDir, `${outName}.${outExt}`)
    )

    isScript ? (scriptEntries[name] = src) : (linkEntries[name] = src)

    if (isScript && item.type) {
      item.type === "false"
        ? el.removeAttribute("type")
        : el.setAttribute("type", item.type)
    }
    el.setAttribute(srcAttr, assetPath)
    cleanElement(el, cleanAttributes)
    return
  })

  Object.entries(linkEntries).map((item) => {
    dynamicEntries[item[0]] = item[1]
    return
  })
  Object.entries(scriptEntries).map((item) => {
    const entryId = Object.hasOwn(dynamicEntries, item[0])
      ? `${item[0]}-ministaDuplicateName0`
      : item[0]
    dynamicEntries[entryId] = item[1]
    return
  })
}
