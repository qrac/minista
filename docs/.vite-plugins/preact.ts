import type { Plugin } from "vite"

const preactAlias = {
  react: "preact/compat",
  "react-dom": "preact/compat",
}

export function pluginPreact(): Plugin {
  return {
    name: "minista-docs:local-preact",
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
