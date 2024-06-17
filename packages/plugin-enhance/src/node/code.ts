import type { SsgPage } from "minista-shared-utils"
import type { PluginOptions } from "./option.js"

export function getGlobExportCode(opts: PluginOptions): string {
  const pages = JSON.stringify(opts.src)
  return `const PAGES = import.meta.glob(${pages}, { eager: true })
export { PAGES }`
}

export function getSsgExportCode(ssgPages: SsgPage[]): string {
  return `export const ssgPages = ${JSON.stringify(ssgPages)}`
}
