import type { PluginOptions } from "./option.js"

export function getPartialSerials(html: string, opts: PluginOptions) {
  const { rootDOMElement, rootAttrSuffix, rootValuePrefix } = opts
  const tag = rootDOMElement
  const attr = `data-${rootAttrSuffix}`
  const pre = rootValuePrefix
  const regex = new RegExp(`<${tag}[^>]*?${attr}="${pre}-([^"]*)"`, "g")

  let match: RegExpExecArray | null
  let serials: number[] = []

  while ((match = regex.exec(html)) !== null) {
    serials.push(Number(match[1]))
  }
  if (serials.length === 0) return []

  serials = [...new Set(serials)]
  serials.sort((a, b) => a - b)

  return serials
}
