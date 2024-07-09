import type { UserConfig } from "vite"
import { defineConfig } from "minista"
import { pluginSsg } from "minista-plugin-ssg"
import { pluginBundle } from "minista-plugin-bundle"
import { pluginHydrate } from "minista-plugin-hydrate"

type CustomOutput = UserConfig["build"]["rollupOptions"]["output"]
type CustomAlias = UserConfig["resolve"]["alias"]

const debugMinify = false
const debugChunks = true
const debugPreact = true

const customOutput: CustomOutput = {
  minifyInternalExports: debugMinify,
  manualChunks: (id) => {
    if (id.includes("node_modules") && !id.includes(".minista")) {
      return id.toString().split("node_modules/")[1].split("/")[0].toString()
    }
  },
}
const customAlias: CustomAlias = [
  { find: "react", replacement: "preact/compat" },
  { find: "react-dom", replacement: "preact/compat" },
]

export default defineConfig(({ command, isSsrBuild }) => {
  const activeChunks = command === "build" && !isSsrBuild && debugChunks
  const activePreact = command === "build" && !isSsrBuild && debugPreact
  return {
    plugins: [pluginSsg(), pluginBundle(), pluginHydrate()],
    build: {
      minify: debugMinify,
      rollupOptions: {
        output: activeChunks ? customOutput : {},
      },
    },
    resolve: {
      alias: activePreact ? customAlias : {},
    },
  }
})
