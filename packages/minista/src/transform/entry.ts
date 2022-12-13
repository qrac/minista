import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"

import type { ResolvedConfig } from "../config/index.js"
import type { ResolvedViteEntry } from "../config/entry.js"
import { getBasedAssetPath, isLocalPath } from "../utility/path.js"

export function transformDynamicEntry({
  el,
  pathname,
  config,
  selfEntries,
  otherEntries,
}: {
  el: NHTMLElement
  pathname: string
  config: ResolvedConfig
  selfEntries: ResolvedViteEntry
  otherEntries: ResolvedViteEntry
}) {
  const { assets } = config.main
  const { resolvedRoot } = config.sub

  const tagName = el.tagName.toLowerCase()
  const isScript = tagName === "script"
  const srcAttr = isScript ? "src" : "href"
  const outExt = isScript ? "js" : "css"

  let src = ""
  src = el.getAttribute(srcAttr) || ""
  src = path.join(resolvedRoot, src)

  let name = ""
  name = el.getAttribute("data-minista-entry-name") || ""
  name = name ? name : path.parse(src).name

  let attributes = ""
  attributes = el.getAttribute("data-minista-entry-attributes") || ""

  let assetPath = ""
  assetPath = path.join(assets.outDir, name + "." + outExt)
  assetPath = getBasedAssetPath({
    base: config.main.base,
    pathname,
    assetPath,
  })

  if (isScript && attributes) {
    el.removeAttribute("type")
  }
  if (attributes && attributes !== "false") {
    const attrStrArray = attributes.split(/\s+/)

    let attrObj: { [key: string]: string } = {}

    attrStrArray.map((attrStr) => {
      const parts = attrStr.split("=")
      const key = parts[0]
      const value = parts[1].replace(/\"/g, "")
      return (attrObj[key] = value)
    })
    for (const key in attrObj) {
      el.setAttribute(key, attrObj[key])
    }
  }

  el.setAttribute(srcAttr, assetPath)
  el.removeAttribute("data-minista-entry-name")
  el.removeAttribute("data-minista-entry-attributes")

  const duplicateName = `${name}-ministaDuplicateName0`

  if (Object.hasOwn(selfEntries, name)) {
    return
  }
  if (Object.hasOwn(selfEntries, duplicateName)) {
    return
  }
  if (Object.hasOwn(otherEntries, name)) {
    selfEntries[duplicateName] = src
    return
  }
  selfEntries[name] = src
  return
}

export function transformDynamicEntries({
  parsedHtml,
  pathname,
  config,
  linkEntries,
  scriptEntries,
}: {
  parsedHtml: NHTMLElement
  pathname: string
  config: ResolvedConfig
  linkEntries: ResolvedViteEntry
  scriptEntries: ResolvedViteEntry
}) {
  const { resolvedRoot } = config.sub

  let _parsedHtml = parsedHtml

  const links = _parsedHtml.querySelectorAll("link").filter((el) => {
    const url = el.getAttribute("href") || ""
    return isLocalPath(resolvedRoot, url)
  })

  const scripts = _parsedHtml.querySelectorAll("script").filter((el) => {
    const url = el.getAttribute("src") || ""
    return isLocalPath(resolvedRoot, url)
  })

  links.map((el) => {
    return transformDynamicEntry({
      el,
      pathname,
      config,
      selfEntries: linkEntries,
      otherEntries: scriptEntries,
    })
  })
  scripts.map((el) => {
    return transformDynamicEntry({
      el,
      pathname,
      config,
      selfEntries: scriptEntries,
      otherEntries: linkEntries,
    })
  })

  return _parsedHtml
}
