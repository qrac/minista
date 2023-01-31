import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"
import { parse as parseHtml } from "node-html-parser"

import type { ResolvedConfig } from "../config/index.js"
import { flags } from "../config/system.js"
import { getElements, cleanElement } from "../utility/element.js"

const cleanAttributes = ["data-minista-transform-target"]

export function getArchiveTag(
  archive: Omit<
    ResolvedConfig["main"]["delivery"]["archives"][0],
    "srcDir" | "options" | "ignore"
  >,
  resolvedBase?: string,
  hasRelativeFlag?: boolean
) {
  const outFile = archive.outName + "." + archive.format
  const fileName = path.join(archive.outDir, outFile)
  const title = archive.button?.title ? archive.button.title : outFile
  const href = resolvedBase ? path.join(resolvedBase, fileName) : fileName
  const color = archive.button?.color ? archive.button.color : ""
  const classAttr = `class="minista-delivery-button"`
  const styleAttr = color ? ` style="background-color: ${color};"` : ""
  const flag = hasRelativeFlag ? ` ${flags.relative}` : ""

  return `<a ${classAttr} href="${href}"${styleAttr}${flag} download>${title}</a>`
}

export function transformArchives({
  parsedData,
  config,
}: {
  parsedData: NHTMLElement | NHTMLElement[]
  config: ResolvedConfig
}) {
  const { resolvedBase } = config.sub
  const { base } = config.main
  const { archives } = config.main.delivery

  const targetAttr = `[data-minista-transform-target="archive"]`
  const targetEls = getElements(parsedData, targetAttr)

  if (!targetEls.length || !archives.length) {
    return
  }
  const insertTags = archives.map((archive) => {
    const hasRelativeFlag = base === "" || base === "./"
    return getArchiveTag(archive, resolvedBase, hasRelativeFlag)
  })
  const insertEl = parseHtml(insertTags.join("\n"))

  targetEls.map((el) => {
    el.parentNode.exchangeChild(el, insertEl)
    cleanElement(el, cleanAttributes)
    return
  })
}
