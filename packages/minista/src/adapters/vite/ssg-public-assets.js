// @ts-check

import { glob } from "tinyglobby"
import { NodeHtmlDocumentFactory } from "../html/index.js"
import { createNodeId } from "../../core/graph/index.js"
import { selectIslandContent } from "../../features/island/index.js"
import { composeSsgPublicAssetDocument } from "../../features/ssg/public-assets.js"
import { getBasedAssetUrl, getBuildBase } from "../../shared/url.js"

/**
 * Run after client preparation, using resolved publicDir for all build paths.
 * Public files remain owned and copied by Vite, without new output claims.
 * @param {readonly import("../../features/ssg/index.js").RenderedPage[]} pages
 * @param {import("vite").ResolvedConfig} config
 * @param {ReadonlySet<string>} entrySources
 */
export async function composeViteSsgPublicAssets(pages, config, entrySources) {
  const base = getBuildBase(config.base)
  if (base === "/" || !config.publicDir || pages.length === 0) return pages
  let files
  try {
    files = new Set(await glob("**/*", { cwd: config.publicDir, dot: true, onlyFiles: true }))
  } catch (cause) {
    const message = "Failed to discover SSG public assets."
    throw Object.assign(new Error(message, { cause }), {
      diagnostic: Object.freeze({
        code: "MINISTA_SSG_PUBLIC_ASSETS_FAILED", severity: "error", message,
        feature: "feature:ssg", phase: "compose",
        hint: "Check that Vite's publicDir can be read.",
      }),
    })
  }
  if (files.size === 0) return pages
  const island = config.plugins.find((plugin) => plugin.api?.minista?.feature?.id === "island")
  const factory = new NodeHtmlDocumentFactory()
  const basedFiles = new Set(
    base === "./" || base === "" ? [] :
      [...files].map((file) => getBasedAssetUrl(base, "index.html", file)),
  )

  return pages.map((page) => {
    const document = factory.parse({ pageId: createNodeId("page", page.url), html: page.html })
    const excluded = new Set(island
      ? selectIslandContent(document, island.api.minista.feature.options)
      : [])
    const changed = composeSsgPublicAssetDocument(document, files, {
      resolve(fileName) {
        if (entrySources.has(fileName) || basedFiles.has(`/${decodeURIComponent(fileName)}`)) return undefined
        return getBasedAssetUrl(base, page.fileName, fileName)
      },
    }, excluded)
    return changed ? Object.freeze({ ...page, html: document.serialize() }) : page
  })
}
