/** @typedef {import('svgo').Config} Config */

import fs from "node:fs"
import path from "node:path"
import { glob } from "tinyglobby"
import { optimize } from "svgo"
import { parse as parseHtml } from "node-html-parser"

/**
 * SVGO expects a single well-formed XML document with exactly one root
 * element. The inner content of a <symbol> or <svg> can legally contain
 * several sibling elements (<path>, <rect>, <text>, ...), so passing that
 * fragment straight to `optimize()` makes its strict SAX parser throw
 * (e.g. "Text data outside of root node.") once it sees content after
 * the first sibling closes. Wrap the fragment in a throwaway <svg> root
 * before optimizing, then unwrap it again from the result.
 *
 * @param {string} innerHtml
 * @param {string} viewBox
 * @param {Config} [config]
 * @returns {string}
 */
function optimizeFragment(innerHtml, viewBox, config) {
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox}">${innerHtml}</svg>`
  const { data } = optimize(wrapped, config)
  const el = parseHtml(data).querySelector("svg")
  return el?.innerHTML || ""
}

/**
 * @param {string} targetDir
 * @param {Config} [config]
 * @returns {Promise<string>}
 */
export async function generateSprite(targetDir, config) {
  const svgNames = await glob(`*.svg`, { cwd: targetDir })

  if (!svgNames.length) return ""

  /** @type {{[id: string]: {viewBox: string; content: string}}} */
  let symbols = {}

  for (const svgName of svgNames) {
    const svgPath = path.resolve(targetDir, svgName)
    const code = await fs.promises.readFile(svgPath, "utf8")

    if (code.includes("<symbol")) {
      const doc = parseHtml(code)
      const els = doc.querySelectorAll("symbol")
      if (!els.length) continue

      for (const el of els) {
        const id = el.getAttribute("id")
        const viewBox = el.getAttribute("viewBox")
        if (!id || !viewBox) continue
        const content = optimizeFragment(el.innerHTML, viewBox, config)
        if (!content) continue
        symbols[id] = { viewBox, content }
      }
    } else {
      const doc = parseHtml(code)
      const el = doc.querySelector("svg")
      const id = path.parse(svgName).name
      const viewBox = el?.getAttribute("viewBox")
      if (!id || !viewBox) continue
      const content = optimizeFragment(el?.innerHTML || "", viewBox, config)
      if (!content) continue
      symbols[id] = { viewBox, content }
    }
  }

  let symbolList = Object.entries(symbols).map(([id, item]) => {
    return {
      id,
      viewBox: item.viewBox,
      content: item.content,
    }
  })

  if (!symbolList.length) return ""

  symbolList = symbolList.sort((a, b) => {
    if (a.id < b.id) return -1
    if (a.id > b.id) return 1
    return 0
  })
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">`,
    symbolList
      .map(
        ({ id, viewBox, content }) =>
          `<symbol id="${id}" viewBox="${viewBox}">${content}</symbol>`,
      )
      .join("\n"),
    `</svg>`,
  ].join("\n")
}
