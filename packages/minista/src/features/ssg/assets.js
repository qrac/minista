// @ts-check

/** @typedef {import("../../core/document/index.js").HtmlDocument} HtmlDocument */
/** @typedef {import("./assets.js").SsgAssetPlan} SsgAssetPlan */
/** @typedef {import("./assets.js").SsgAssetOutputResolver} SsgAssetOutputResolver */

/** @param {string} value */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * @param {string} value
 * @param {string} fileName
 * @param {string} output
 */
function replaceRootAsset(value, fileName, output) {
  return value.replace(
    new RegExp(`(^|,\\s*)/${escapeRegExp(fileName)}(?=([#?\\s,]|$))`, "g"),
    `$1${output}`,
  )
}

/**
 * @param {HtmlDocument} document
 * @param {SsgAssetPlan} plan
 * @returns {readonly string[]}
 */
export function collectSsgAssetOutputReferences(document, plan) {
  const references = new Set()
  if (document.select("head")[0]) {
    for (const fileName of plan.cssFiles) references.add(fileName)
  }
  for (const fileName of plan.imageFiles) {
    const used = document.select("*").some((element) =>
      ["href", "src", "srcset", "content", "poster"].some((attribute) => {
        const value = element.getAttribute(attribute)
        return value ? value.includes(fileName) : false
      })
    )
    if (used) references.add(fileName)
  }
  return Object.freeze([...references])
}

/**
 * @param {HtmlDocument} document
 * @param {SsgAssetPlan} plan
 * @param {SsgAssetOutputResolver} outputs
 * @returns {number}
 */
export function composeSsgAssetDocument(document, plan, outputs) {
  let composed = 0
  const head = document.select("head")[0]
  if (head) {
    for (const fileName of plan.cssFiles) {
      const output = outputs.resolve(fileName, document.pageId)
      if (!output) continue
      head.appendHtml(`<link rel="stylesheet" href="${output}">`)
      composed += 1
    }
  }
  if (!plan.rewriteRootImages) return composed
  for (const fileName of plan.imageFiles) {
    const output = outputs.resolve(fileName, document.pageId)
    if (!output) continue
    for (const element of document.select("*")) {
      for (const attribute of ["href", "src", "srcset", "content", "poster"]) {
        const value = element.getAttribute(attribute)
        if (!value) continue
        const next = replaceRootAsset(value, fileName, output)
        if (next === value) continue
        element.setAttribute(attribute, next)
        composed += 1
      }
    }
  }
  return composed
}
