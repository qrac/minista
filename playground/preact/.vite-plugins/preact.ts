import preact from "@preact/preset-vite"
import type { Plugin } from "vite"

const clientAliases = {
  "react-dom/test-utils": "preact/test-utils",
  "react-dom": "preact/compat",
  "react/jsx-dev-runtime": "preact/jsx-dev-runtime",
  "react/jsx-runtime": "preact/jsx-runtime",
  react: "preact/compat",
}

function pluginClientPreactResolve(): Plugin {
  return {
    name: "minista-playground:client-preact-resolve",
    enforce: "pre",
    applyToEnvironment: (environment) =>
      environment.config.consumer === "client",
    resolveId(source, importer, options) {
      for (const [find, replacement] of Object.entries(clientAliases)) {
        if (source !== find && !source.startsWith(`${find}/`)) continue
        return this.resolve(
          `${replacement}${source.slice(find.length)}`, importer,
          { ...options, skipSelf: true },
        )
      }
    },
  }
}

function pluginPreactOptimizeDeps(): Plugin {
  return {
    name: "minista-playground:preact-optimize-deps",
    enforce: "post",
    configResolved(config) {
      for (const optimizeDeps of [
        config.optimizeDeps,
        config.environments.client?.optimizeDeps,
      ]) {
        if (!optimizeDeps) continue
        optimizeDeps.include = (optimizeDeps.include ?? []).filter(
          (id) => id !== "react" && !id.startsWith("react/") &&
            id !== "react-dom" && !id.startsWith("react-dom/"),
        )
        optimizeDeps.include.push("preact/compat", "preact/compat/client")
        optimizeDeps.exclude = [
          ...new Set([
            ...(optimizeDeps.exclude ?? []),
            ...Object.keys(clientAliases),
            "react-dom/client",
          ]),
        ]
      }
    },
  }
}

export function pluginPreact(): Plugin[] {
  // Keep React JSX for SSG; browser imports resolve to Preact instead.
  const clientPreactPlugins = preact({
    reactAliasesEnabled: false,
    jsxImportSource: "react",
  }).map((plugin): Plugin => ({
    ...plugin,
    applyToEnvironment: (environment) =>
      environment.config.consumer === "client",
  }))

  return [
    pluginClientPreactResolve(),
    ...clientPreactPlugins,
    pluginPreactOptimizeDeps(),
    {
      name: "minista-playground:preact-dedupe",
      config: () => ({ resolve: { dedupe: ["preact"] } }),
    },
  ]
}
