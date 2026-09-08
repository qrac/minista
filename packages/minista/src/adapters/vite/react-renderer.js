// @ts-check

import { ReactStaticRenderer } from "../react/static.js"
import { ReactRenderToStringRenderer } from "../react/render-to-string.js"

/** @typedef {import("vite").UserConfig} UserConfig */
/** @typedef {import("../../core/ports/index.js").StaticRenderer<import("react").ReactNode>} ReactRenderer */

/** @param {UserConfig} config */
export function hasPreactAlias(config) {
  const alias = config.resolve?.alias
  if (!alias) return false

  const replacements = Array.isArray(alias)
    ? alias.map(({ replacement }) => replacement)
    : Object.values(alias)

  return replacements.some((replacement) =>
    String(replacement).startsWith("preact"),
  )
}

/**
 * React 19以降ではstatic rendererを使用し、Preactではcompatibility rendererを使用する。
 *
 * @param {UserConfig} config
 * @returns {Promise<ReactRenderer>}
 */
export async function createViteReactRenderer(config) {
  if (hasPreactAlias(config)) return new ReactRenderToStringRenderer()

  return new ReactStaticRenderer()
}
