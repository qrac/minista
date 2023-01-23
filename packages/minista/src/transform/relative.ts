import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"

import type { ResolvedConfig } from "../config/index.js"
import { getRelativeAssetPath } from "../utility/path.js"

export function resolveRelativePath({
  pathname,
  replaceTarget,
  assetPath,
}: {
  pathname: string
  replaceTarget: string
  assetPath: string
}) {
  let resolvedPath = assetPath.replace(/\n/, "").trim()

  if (!resolvedPath.includes(",") && resolvedPath.startsWith(replaceTarget)) {
    return getRelativeAssetPath({ pathname, assetPath: resolvedPath })
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
        url = getRelativeAssetPath({ pathname, assetPath: url })
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

  const images = parsedHtml.querySelectorAll("img, source")
  const icons = parsedHtml.querySelectorAll("use")

  images.map((el) => {
    const src = el.getAttribute("src") || ""
    const srcset = el.getAttribute("srcset") || ""

    if (src) {
      const resolvedPath = resolveRelativePath({
        pathname,
        replaceTarget: path.join("/", assets.images.outDir),
        assetPath: src,
      })
      if (src !== resolvedPath) {
        el.setAttribute("src", resolvedPath)
      }
    }

    if (srcset) {
      const resolvedPath = resolveRelativePath({
        pathname,
        replaceTarget: path.join("/", assets.images.outDir),
        assetPath: srcset,
      })
      if (srcset !== resolvedPath) {
        el.setAttribute("srcset", resolvedPath)
      }
    }
    return
  })

  icons.map((el) => {
    const href = el.getAttribute("href") || ""

    if (href) {
      const resolvedPath = resolveRelativePath({
        pathname,
        replaceTarget: path.join("/", assets.icons.outDir),
        assetPath: href,
      })
      if (href !== resolvedPath) {
        el.setAttribute("href", resolvedPath)
      }
    }
    return
  })

  return parsedHtml
}
