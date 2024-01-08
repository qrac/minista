import type { PluginOptions } from "./option.js"

export function getGlobImportCode(opts: PluginOptions): string {
  const bundle = JSON.stringify(opts.src)
  return `import.meta.glob(${bundle}, { eager: true })`
}
