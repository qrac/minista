import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"

import type { ResolvedConfig } from "../config/index.js"
import { flags } from "../config/system.js"
import { cleanElement } from "../utility/element.js"
import { getHtmlPath } from "../utility/path.js"

const cleanAttributes = [flags.relative]

export function getRelativePath({
  pathname,
  replaceTarget,
  assetPath,
}: {
  pathname: string
  replaceTarget: string
  assetPath: string
}) {
  const pagePath = path.dirname(getHtmlPath(pathname))

  let resolvedPath = assetPath.replace(/\n/, "").trim()

  if (!resolvedPath.includes(",") && resolvedPath.startsWith(replaceTarget)) {
    return path.relative(pagePath, path.join("./", resolvedPath))
  }
  if (!resolvedPath.includes(",")) {
    return resolvedPath
  }
  resolvedPath = resolvedPath
    .split(",")
    .map((s) => s.trim())
    .map((s) => {
      let [url, density] = s.split(/\s+/)

      if (url.startsWith(replaceTarget)) {
        url = path.relative(pagePath, path.join("./", url))
      }
      return `${url} ${density}`
    })
    .join(", ")
  return resolvedPath
}

export function transformRelative({
  parsedHtml,
  pathname,
  config,
}: {
  parsedHtml: NHTMLElement
  pathname: string
  config: ResolvedConfig
}) {
  const { assets } = config.main

  const targetEls = parsedHtml.querySelectorAll(
    `link, script, img, source, use, a[${flags.relative}]`
  )
  targetEls.map((el) => {
    const tagName = el.tagName.toLowerCase()
    const outDir = (() => {
      switch (tagName) {
        case "a":
          return ""
        case "img":
        case "source":
          return assets.images.outDir
        case "use":
          return assets.icons.outDir
        default:
          return assets.outDir
      }
    })()
    const attrs = ["src", "srcset", "href"]

    attrs.map((attr) => {
      const assetPath = el.getAttribute(attr) || ""

      if (assetPath) {
        const relativePaths = getRelativePath({
          pathname,
          replaceTarget: path.join("/", outDir),
          assetPath,
        })
        el.setAttribute(attr, relativePaths)
      }
    })
    if (tagName === "a") {
      cleanElement(el, cleanAttributes)
    }
    return
  })
}
