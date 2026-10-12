// @ts-check
import { isViteAppClientEnvironment } from "./app-config.js"
import { ViteApplicationContractError } from "./client-build.js"
import { registerViteFeatureLifecycle } from "./feature-lifecycle.js"
import { getViteBuildSession } from "./build-session.js"
import { processViteOutputs, createViteCompatibilityTraceHooks } from "./compatibility-lifecycle.js"
import { createPwaFeature } from "../../features/pwa/index.js"

/** @param {import("../../plugins/pwa/index.js").PluginPwaOptions} options */
export async function createVitePwaPlugins(options) {
  let upstream
  try {
    upstream = await import("vite-plugin-pwa")
  } catch (error) {
    const missing = /** @type {NodeJS.ErrnoException} */ (error)
    if (missing.code !== "ERR_MODULE_NOT_FOUND" || !missing.message.startsWith("Cannot find package 'vite-plugin-pwa'")) throw error
    throw new ViteApplicationContractError("MINISTA_PWA_DEPENDENCY_MISSING", "pluginPwa requires the optional peer vite-plugin-pwa. Install it with npm install -D vite-plugin-pwa.")
  }
  // SSG has multiple HTML documents; an SPA index fallback would hide missing pages.
  const plugins = upstream.VitePWA(/** @type {import("vite-plugin-pwa").VitePWAOptions} */ ({
    ...options,
    strategies: "generateSW",
    workbox: {
      globPatterns: ["**/*.{html,js,css,json,svg,png,jpg,jpeg,webp,avif,ico,woff,woff2}"],
      navigateFallback: null,
      ...options.workbox,
    },
  }))
  for (const plugin of plugins) plugin.applyToEnvironment = isViteAppClientEnvironment
  const api = /** @type {import("vite-plugin-pwa").VitePluginPWAAPI} */ (plugins.find(plugin => plugin.name === "vite-plugin-pwa")?.api)
  const bridge = registerViteFeatureLifecycle({
    name: "vite-plugin:minista-pwa", enforce: "post", apply: "build",
    applyToEnvironment: isViteAppClientEnvironment,
    api: { minista: { feature: createPwaFeature({}) } },
    async generateBundle(_, bundle) {
      if (this.environment.config.build.ssr || api.disabled) return
      const feature = createPwaFeature({
        manifest: api.webManifestData()?.toLinkTag(),
        register: api.registerSWData()?.toScriptTag(),
      })
      const html = Object.values(bundle).flatMap(item => item.type === "asset" && item.fileName.endsWith(".html") ? [item] : [])
      const result = await processViteOutputs(html.map(item => ({
        fileName: item.fileName, content: typeof item.source === "string" ? item.source : new TextDecoder().decode(item.source),
      })), [feature], createViteCompatibilityTraceHooks(getViteBuildSession(this.environment.getTopLevelConfig()), "pwa:build"))
      for (const page of result) {
        const asset = bundle[page.fileName]
        if (asset?.type === "asset") asset.source = page.content
      }
    },
  })
  return [...plugins, bridge]
}
