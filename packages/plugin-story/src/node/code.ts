import type { SsgPage } from "../@types/node.js"
import type { PluginOptions } from "./option.js"

export function getGlobExportCode(opts: PluginOptions): string {
  const layoutRoot = opts.layoutRoot
  const stories = JSON.stringify(opts.src)
  return `const LAYOUTS = import.meta.glob(["${layoutRoot}"], { eager: true })
const STORIES = import.meta.glob(${stories}, { eager: true })
export { LAYOUTS, STORIES }`
}

export function getSsgExportCode(ssgPages: SsgPage[]): string {
  return `export const ssgPages = ${JSON.stringify(ssgPages)}`
}
