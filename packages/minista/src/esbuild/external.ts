import type { Plugin } from "esbuild"

export function external(): Plugin {
  return {
    name: "minista-esbuild-plugin:external",
    setup(build) {
      let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/
      build.onResolve({ filter }, (args) => ({
        path: args.path,
        external: true,
      }))
    },
  }
}
