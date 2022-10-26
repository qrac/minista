import path from "node:path"
import picomatch from "picomatch"

import type { ResolvedConfig } from "../config/index.js"
import type { ResolvedEntry } from "../config/entry.js"
import { getBasedAssetPath } from "../utility/path.js"

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
  let attributes = ""

  attributes = entry.attributes ? " " + entry.attributes : ""

  if (mode === "serve") {
    assetPath = path.join("/", "@minista-project-root", entry.input)
    return `<link rel="stylesheet"${attributes} href="${assetPath}">`
  }
  assetPath = path.join(config.main.assets.outDir, entry.name + ".css")
  assetPath = getBasedAssetPath({ base: config.main.base, pathname, assetPath })

  return `<link rel="stylesheet"${attributes} href="${assetPath}">`
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
  let attributes = ""

  attributes = entry.attributes ? " " + entry.attributes : ` type="module"`
  attributes = entry.attributes === false ? "" : attributes

  if (mode === "serve") {
    assetPath = path.join("/", "@minista-project-root", entry.input)
    return `<script${attributes} src="${assetPath}"></script>`
  }
  assetPath = path.join(config.main.assets.outDir, entry.name + ".js")
  assetPath = getBasedAssetPath({ base: config.main.base, pathname, assetPath })

  return `<script${attributes} src="${assetPath}"></script>`
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

  let bundleHeadLinkTag = ""
  let bundleEndScriptTag = ""
  let partialHeadScriptTag = ""
  let partialEndScriptTag = ""

  if (mode === "serve") {
    bundleEndScriptTag = `<script type="module" src="/@minista/dist/scripts/bundle.js"></script>`
    partialEndScriptTag = `<script type="module" src="/@minista/dist/scripts/partial.js"></script>`
  }
  if (mode === "ssg") {
    const bundleCss = getBasedAssetPath({
      base: config.main.base,
      pathname,
      assetPath: path.join(
        config.main.assets.outDir,
        config.main.assets.bundle.outName + ".css"
      ),
    })
    const partialJs = getBasedAssetPath({
      base: config.main.base,
      pathname,
      assetPath: path.join(
        config.main.assets.outDir,
        config.main.assets.partial.outName + ".js"
      ),
    })
    bundleHeadLinkTag = `<link rel="stylesheet" data-minista-build-bundle-href="${bundleCss}">`
    partialHeadScriptTag = `<script type="module" data-minista-build-partial-src="${partialJs}"></script>`
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

  headTags = [
    ...headLinkTags,
    bundleHeadLinkTag,
    ...headScriptTags,
    partialHeadScriptTag,
  ]
    .filter((tag) => tag)
    .join("\n")

  startTags = [...startLinkTags, ...startScriptTags]
    .filter((tag) => tag)
    .join("\n")

  endTags = [
    ...endLinkTags,
    ...endScriptTags,
    bundleEndScriptTag,
    partialEndScriptTag,
  ]
    .filter((tag) => tag)
    .join("\n")

  return {
    headTags,
    startTags,
    endTags,
  }
}
