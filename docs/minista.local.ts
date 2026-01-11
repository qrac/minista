import type { Plugin } from "rolldown-vite"
import type { OutputBundle, OutputAsset } from "rolldown"
import { parse as parseHtml } from "node-html-parser"
import picomatch from "picomatch"

function filterOutputAssets(bundle: OutputBundle): {
  [key: string]: OutputAsset
} {
  return Object.entries(bundle).reduce((acc, [key, item]) => {
    if (item.type === "asset") {
      acc[key] = item
    }
    return acc
  }, {})
}

export function pluginSeo(opts: {
  src?: string[]
  maxLength?: number
  targetSelector?: string
  ignoreSelectors?: string[]
  writeSelectors?: string[]
}): Plugin {
  const defaultOptions = {
    src: ["**/*.html"],
    maxLength: 160,
    targetSelector: "main",
    ignoreSelectors: [],
    writeSelectors: [
      `head > meta[name="description"]`,
      `head > meta[property="og:description"]`,
    ],
  }
  const _opts = { ...defaultOptions, ...opts }
  const { src, maxLength } = _opts
  const { targetSelector, ignoreSelectors, writeSelectors } = _opts

  let isSsr = false

  return {
    name: "minista-local-plugin-seo",
    enforce: "pre",
    apply: "build",
    config: async (config) => {
      isSsr = !!config.build?.ssr
    },
    async generateBundle(options, bundle) {
      if (isSsr) return

      const isMatch = picomatch(src)
      const regAssets = /\.(html)$/

      const outputAssets = filterOutputAssets(bundle)

      for (const item of Object.values(outputAssets)) {
        if (!isMatch(item.fileName)) continue
        if (!regAssets.test(item.fileName)) continue
        if (!item.source) continue

        let tempHtml = parseHtml(String(item.source), {
          blockTextElements: { script: false, style: false, pre: false },
        })
        let targetEl = tempHtml.querySelector(targetSelector)

        if (!targetEl) continue

        let ignoreEls = []

        for (const selector of ignoreSelectors) {
          const ignoreItems = targetEl.querySelectorAll(selector)
          for (const el of ignoreItems) {
            ignoreEls.push(el)
          }
        }
        for (const el of ignoreEls) el.remove()

        const textContent = targetEl.textContent || ""
        const excerpt =
          textContent.replace(/\s+/g, " ").trim().slice(0, maxLength) +
          (textContent.length > maxLength ? "…" : "")

        if (!excerpt) continue

        let parsedHtml = parseHtml(String(item.source))

        const writeEls = writeSelectors
          .map((selector) => parsedHtml.querySelector(selector))
          .filter((el): el is typeof el => !!el)

        for (const el of writeEls) {
          if (el.tagName.toLowerCase() !== "meta") continue
          el.setAttribute("content", excerpt)
        }

        item.source = parsedHtml.toString()
      }
    },
  }
}
