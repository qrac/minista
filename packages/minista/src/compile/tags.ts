import path from "node:path"
import picomatch from "picomatch"

import type { ResolvedConfig } from "../config/index.js"
import type { ResolvedEntry } from "../config/entry.js"
import { getHtmlPath } from "../utility/path.js"

export function compileBundleTag({
  pathname,
  config,
}: {
  pathname: string
  config: ResolvedConfig
}) {
  let assetPath = ""

  const assetName = path.join(
    config.main.assets.outDir,
    config.main.assets.bundle.outName + ".css"
  )

  if (config.main.base === "" || config.main.base === "./") {
    const fileName = getHtmlPath(pathname)
    const filePath = path.dirname(fileName)
    const bundleCssPath = path.join("./", assetName)
    const relativePath = path.relative(filePath, bundleCssPath)
    assetPath = relativePath
  } else {
    assetPath = path.join(config.main.base, assetName)
  }
  return `<link rel="stylesheet" data-minista-build-bundle-href="${assetPath}">`
}

export function compileLinkTag({
  mode,
  pathname,
  entry,
  config,
}: {
  mode: "serve" | "ssg"
  pathname: string
  entry: ResolvedEntry[0]
  config: ResolvedConfig
}) {
  let assetPath = ""

  const assetName = path.join(config.main.assets.outDir, entry.name + ".css")

  if (mode === "serve") {
    assetPath = path.join("/", "@minista-project-root", entry.input)
    return `<link rel="stylesheet" href="${assetPath}">`
  }

  if (config.main.base === "" || config.main.base === "./") {
    const fileName = getHtmlPath(pathname)
    const filePath = path.dirname(fileName)
    const cssPath = path.join("./", assetName)
    const relativePath = path.relative(filePath, cssPath)
    assetPath = relativePath
  } else {
    assetPath = path.join(config.main.base, assetName)
  }
  return `<link rel="stylesheet" href="${assetPath}">`
}

export function compileScriptTag({
  mode,
  pathname,
  entry,
  config,
}: {
  mode: "serve" | "ssg"
  pathname: string
  entry: ResolvedEntry[0]
  config: ResolvedConfig
}) {
  let assetPath = ""

  const assetName = path.join(config.main.assets.outDir, entry.name + ".js")
  const deferStr = entry.loadType === "defer" ? " defer" : ""
  const asyncStr = entry.loadType === "async" ? " async" : ""

  if (mode === "serve") {
    assetPath = path.join("/", "@minista-project-root", entry.input)
    return `<script${deferStr}${asyncStr} src="${assetPath}"></script>`
  }

  if (config.main.base === "" || config.main.base === "./") {
    const fileName = getHtmlPath(pathname)
    const filePath = path.dirname(fileName)
    const cssPath = path.join("./", assetName)
    const relativePath = path.relative(filePath, cssPath)
    assetPath = relativePath
  } else {
    assetPath = path.join(config.main.base, assetName)
  }
  return `<script${deferStr}${asyncStr} src="${assetPath}"></script>`
}

export function compileEntryTags({
  mode,
  pathname,
  config,
}: {
  mode: "serve" | "ssg"
  pathname: string
  config: ResolvedConfig
}) {
  function scriptFilter(entries: ResolvedEntry, isScript: boolean) {
    const regex = /\.(js|cjs|mjs|jsx|ts|tsx)$/
    if (isScript) {
      return entries.filter((entry) => entry.input.match(regex))
    } else {
      return entries.filter((entry) => !entry.input.match(regex))
    }
  }

  function createTags(entries: ResolvedEntry) {
    let linkTags: string[] = []
    let scriptTags: string[] = []

    const linkEntries = scriptFilter(entries, false)
    const scriptEntries = scriptFilter(entries, true)

    if (linkEntries.length > 0) {
      linkTags = linkEntries.map((entry) => {
        return compileLinkTag({
          mode,
          pathname,
          entry,
          config,
        })
      })
    }
    if (scriptEntries.length > 0) {
      scriptTags = scriptEntries.map((entry) => {
        return compileScriptTag({
          mode,
          pathname,
          entry,
          config,
        })
      })
    }
    return { linkTags, scriptTags }
  }

  let headTags = ""
  let startTags = ""
  let endTags = ""

  let headLinkTags: string[] = []
  let headScriptTags: string[] = []
  let startLinkTags: string[] = []
  let startScriptTags: string[] = []
  let endLinkTags: string[] = []
  let endScriptTags: string[] = []

  let bundleCssTag = ""
  let bundleJsTag = ""

  if (mode === "ssg") {
    bundleCssTag = compileBundleTag({ pathname, config })
  }
  if (mode === "serve") {
    bundleJsTag = `<script type="module">import "/@minista/dist/gather/assets.js"</script>`
  }

  const pageEntries = config.sub.resolvedEntry.filter((entry) => {
    return picomatch.isMatch(pathname, entry.insertPages)
  })
  const headEntries = pageEntries.filter((entry) => entry.position === "head")
  const startEntries = pageEntries.filter((entry) => entry.position === "start")
  const endEntries = pageEntries.filter((entry) => entry.position === "end")

  if (headEntries.length > 0) {
    const { linkTags, scriptTags } = createTags(headEntries)
    headLinkTags = linkTags
    headScriptTags = scriptTags
  }

  if (startEntries.length > 0) {
    const { linkTags, scriptTags } = createTags(startEntries)
    startLinkTags = linkTags
    startScriptTags = scriptTags
  }

  if (endEntries.length > 0 || mode === "serve") {
    const { linkTags, scriptTags } = createTags(endEntries)
    endLinkTags = linkTags
    endScriptTags = scriptTags
  }

  headTags = [...headLinkTags, bundleCssTag, ...headScriptTags]
    .filter((tag) => tag)
    .join("\n")

  startTags = [...startLinkTags, ...startScriptTags]
    .filter((tag) => tag)
    .join("\n")

  endTags = [...endLinkTags, ...endScriptTags, bundleJsTag]
    .filter((tag) => tag)
    .join("\n")

  return {
    headTags,
    startTags,
    endTags,
  }
}
