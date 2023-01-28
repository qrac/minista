import path from "node:path"
import picomatch from "picomatch"

import type { ResolvedConfig } from "../config/index.js"
import type { ResolvedEntry } from "../config/entry.js"

export function getLinkTag({
  command,
  name,
  input,
  attributes,
  config,
}: {
  command: "build" | "serve"
  name: string
  input: string
  attributes?: string | false
  config: ResolvedConfig
}) {
  const { resolvedBase } = config.sub
  const { assets } = config.main

  let assetPath = ""
  let attrs = ""

  attrs = attributes ? " " + attributes : ""

  if (command === "serve") {
    assetPath = path.join("/", "@minista-project-root", input)
    return `<link rel="stylesheet"${attrs} href="${assetPath}">`
  }
  assetPath = path.join(resolvedBase, assets.outDir, name + ".css")
  assetPath = assetPath.replace(/-ministaDuplicateName\d*/, "")

  return `<link rel="stylesheet"${attrs} href="${assetPath}">`
}

export function getScriptTag({
  command,
  name,
  input,
  attributes,
  config,
}: {
  command: "build" | "serve"
  name: string
  input: string
  attributes?: string | false
  config: ResolvedConfig
}) {
  const { resolvedBase } = config.sub
  const { assets } = config.main

  let assetPath = ""
  let attrs = ""

  attrs = attributes ? " " + attributes : ` type="module"`
  attrs = attributes === false ? "" : attrs

  if (command === "serve") {
    assetPath = path.join("/", "@minista-project-root", input)
    return `<script${attrs} src="${assetPath}"></script>`
  }
  assetPath = path.join(resolvedBase, assets.outDir, name + ".js")
  assetPath = assetPath.replace(/-ministaDuplicateName\d*/, "")

  return `<script${attrs} src="${assetPath}"></script>`
}

export function transformTags({
  command,
  pathname,
  config,
}: {
  command: "build" | "serve"
  pathname: string
  config: ResolvedConfig
}) {
  const { resolvedBase } = config.sub
  const { assets } = config.main

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
        return getLinkTag({
          command,
          name: entry.name,
          input: entry.input,
          attributes: entry.attributes,
          config,
        })
      })
    }
    if (scriptEntries.length > 0) {
      scriptTags = scriptEntries.map((entry) => {
        return getScriptTag({
          command,
          name: entry.name,
          input: entry.input,
          attributes: entry.attributes,
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
  let bundleHeadScriptTag = ""
  let hydrateHeadScriptTag = ""

  if (command === "serve") {
    bundleHeadScriptTag = `<script type="module" src="/@minista/dist/server/bundle.js"></script>`
    hydrateHeadScriptTag = `<script type="module" src="/@minista/dist/server/hydrate.js"></script>`
  }
  if (command === "build") {
    const bundleCss = path.join(
      resolvedBase,
      assets.outDir,
      assets.bundle.outName + ".css"
    )
    const hydrateJs = path.join(
      resolvedBase,
      assets.outDir,
      assets.partial.outName + ".js"
    )
    bundleHeadLinkTag = `<link rel="stylesheet" data-minista-build-bundle-href="${bundleCss}">`
    hydrateHeadScriptTag = `<script type="module" data-minista-build-hydrate-src="${hydrateJs}"></script>`
  }

  const pageEntries = config.sub.resolvedEntry.filter((entry) => {
    return picomatch.isMatch(pathname, entry.insertPages.include, {
      ignore: entry.insertPages.exclude,
    })
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

  if (endEntries.length > 0 || command === "serve") {
    const { linkTags, scriptTags } = createTags(endEntries)
    endLinkTags = linkTags
    endScriptTags = scriptTags
  }

  headTags = [
    ...headLinkTags,
    bundleHeadLinkTag,
    ...headScriptTags,
    bundleHeadScriptTag,
    hydrateHeadScriptTag,
  ]
    .filter((tag) => tag)
    .join("\n")

  startTags = [...startLinkTags, ...startScriptTags]
    .filter((tag) => tag)
    .join("\n")

  endTags = [...endLinkTags, ...endScriptTags].filter((tag) => tag).join("\n")

  return {
    headTags,
    startTags,
    endTags,
  }
}
