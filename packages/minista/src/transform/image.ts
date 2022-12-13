import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"

import type { ResolvedConfig } from "../config/index.js"
import { resolveRelativeImagePath } from "../utility/path.js"

export function transformRelativeImages({
  parsedHtml,
  pathname,
  config,
}: {
  parsedHtml: NHTMLElement
  pathname: string
  config: ResolvedConfig
}) {
  const { assets } = config.main

  let _parsedHtml = parsedHtml

  const images = _parsedHtml.querySelectorAll("img, source")
  const icons = _parsedHtml.querySelectorAll("use")

  images.map((el) => {
    const src = el.getAttribute("src") || ""
    const srcset = el.getAttribute("srcset") || ""

    if (src) {
      const resolvedPath = resolveRelativeImagePath({
        pathname,
        replaceTarget: path.join("/", assets.images.outDir),
        assetPath: src,
      })
      if (src !== resolvedPath) {
        el.setAttribute("src", resolvedPath)
      }
    }

    if (srcset) {
      const resolvedPath = resolveRelativeImagePath({
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
      const resolvedPath = resolveRelativeImagePath({
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

  return _parsedHtml
}
