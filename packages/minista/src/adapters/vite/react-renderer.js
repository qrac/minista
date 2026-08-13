// @ts-check

import { ReactRenderToStringRenderer } from "../react/render-to-string.js"

/** @typedef {import("vite").UserConfig} UserConfig */
/** @typedef {import("../../core/ports/index.js").StaticRenderer<import("react").ReactNode>} ReactRenderer */

// Viteがbuild用にNODE_ENVを切り替える前にReactとreact-domの条件を揃える。
// React 18ではreact-dom/staticが存在しないため、失敗はcompatibility fallbackとして保持する。
const staticRendererModule = import("../react/static.js").catch(() => undefined)

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
 * React 19ではstatic rendererを使用し、Preact/React 18では現行rendererへ戻す。
 *
 * @param {UserConfig} config
 * @returns {Promise<ReactRenderer>}
 */
export async function createViteReactRenderer(config) {
  if (hasPreactAlias(config)) return new ReactRenderToStringRenderer()

  const module = await staticRendererModule
  return module
    ? new module.ReactStaticRenderer()
    : new ReactRenderToStringRenderer()
}
