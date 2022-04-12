import { defineConfig } from "tsup"

export default defineConfig({
  entryPoints: ["src/*.{ts,tsx}"],
  target: "node14", // needed for working ESM
  format: ["esm"],
  clean: false,
  minify: false,
  dts: false,
  bundle: false,
  skipNodeModulesBundle: true,
  splitting: false,
  external: ["esbuild", "react", "react-dom", "react-router-dom"],
  inject: ["lib/shim-react.js"],
})
