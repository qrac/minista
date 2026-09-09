// @ts-check
import { createHash } from "node:crypto"
import { parse } from "node-html-parser"
import { loadDependency } from "../dependencies/svgo.js"

/** @param {string} code @param {import("svgo").Config} [config] */
export async function optimizeSvg(code, config) {
  return (await loadDependency()).optimize(code, config)
}

/** @param {import("node-html-parser").HTMLElement} svg */
export function readSvgSource(svg) {
  return Object.freeze({
    innerHtml: svg.innerHTML,
    viewBox: svg.getAttribute("viewBox"),
    attributes: Object.freeze(Object.fromEntries(
      Object.entries(svg.attributes).filter(([name]) => svgRootAttributes.has(name)),
    )),
  })
}

/** @param {import("../../features/svg/index.js").SvgSource} source @param {string} key */
export async function namespaceSvgSource(source, key) {
  const svg = parse("<svg></svg>").querySelector("svg")
  if (!svg) throw new Error("Expected SVG root")
  for (const [name, value] of Object.entries(source.attributes ?? {})) svg.setAttribute(name, value)
  svg.set_content(source.innerHtml)
  const result = parse(await namespaceSvg(svg.toString(), key)).querySelector("svg")
  if (!result) throw new Error("Expected SVG root")
  return readSvgSource(result)
}

/** @param {string} code @param {string} key @param {string[]} [publicIds] */
export async function namespaceSvg(code, key, publicIds = []) {
  const prefix = "minista-" + createHash("sha256").update(key).digest("hex").slice(0, 20) + "__"
  const { data } = await optimizeSvg(code, { plugins: [
    { name: "prefixIds", params: { prefix, delim: "", prefixClassNames: false } },
    { name: "minista-idrefs", fn: () => ({ element: { enter(node) {
      for (const name of ["aria-labelledby", "aria-describedby"]) {
        if (node.attributes[name]) node.attributes[name] = node.attributes[name].split(/\s+/).map(id => prefix + id).join(" ")
      }
    } } }) },
  ] })
  let result = data
  for (const id of publicIds) {
    const escaped = (prefix + id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    result = result.replace(new RegExp(escaped + '(?=[\\s"\'<>);}]|$)', "g"), () => id)
  }
  return result
}

// Only source rendering attributes cross the composition boundary.
const svgRootAttributes = new Set(`
  xmlns xmlns:xlink viewBox preserveAspectRatio width height x y
  fill fill-opacity fill-rule stroke stroke-width stroke-opacity
  stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset
  opacity color color-interpolation color-interpolation-filters color-rendering
  display visibility overflow transform transform-origin vector-effect
  clip-path clip-rule mask filter paint-order shape-rendering text-rendering
  image-rendering marker-start marker-mid marker-end
  font-family font-size font-style font-weight font-stretch font-variant
  text-anchor dominant-baseline alignment-baseline baseline-shift
  letter-spacing word-spacing writing-mode direction unicode-bidi
  stop-color stop-opacity flood-color flood-opacity lighting-color
  style class
`.trim().split(/\s+/))
