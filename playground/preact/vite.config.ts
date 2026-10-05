import { defineConfig, pluginSsg, pluginIsland } from "minista"
import type { Plugin } from "vite"

// Keep React for SSG and development; convert the client build to Preact.
const preactAlias = {
  react: "preact/compat",
  "react-dom": "preact/compat",
}

function pluginClientPreactAlias(): Plugin {
  return {
    name: "minista-playground:client-preact-alias",
    enforce: "pre",
    apply: "build",
    applyToEnvironment: (environment) =>
      environment.config.consumer === "client",
    resolveId(source, importer, options) {
      for (const [find, replacement] of Object.entries(preactAlias)) {
        if (source !== find && !source.startsWith(`${find}/`)) continue
        const resolvedSource = `${replacement}${source.slice(find.length)}`
        return this.resolve(resolvedSource, importer, {
          ...options,
          skipSelf: true,
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [pluginSsg(), pluginIsland(), pluginClientPreactAlias()],
})
