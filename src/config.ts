import type { MinistaUserConfig } from "./types.js"

export const defaultConfig = {
  outDir: "dist",
  publicDir: "public",
  assetsDir: "assets",
  autoAssetsName: "bundle",
  rootFileDir: "src",
  rootFileName: "root",
  rootFileExt: ["js", "jsx", "ts", "tsx"],
  pagesDir: "src/pages",
  pagesExt: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  tempDir: "node_modules/.minista",
  tempConfigDir: "node_modules/.minista/optimized-config",
  tempAssetsDir: "node_modules/.minista/bundled-react-assets",
  tempRootFileDir: "node_modules/.minista/bundled-react-root",
  tempPagesDir: "node_modules/.minista/bundled-react-pages",
}

export async function getConfig(userConfig: MinistaUserConfig) {
  const mergedConfig = {
    ...defaultConfig,
    outDir: userConfig.outDir ? userConfig.outDir : defaultConfig.outDir,
    publicDir: userConfig.publicDir
      ? userConfig.publicDir
      : defaultConfig.publicDir,
    assetsDir: userConfig.assetsDir
      ? userConfig.assetsDir
      : defaultConfig.assetsDir,
    autoAssetsName: userConfig.autoAssetsName
      ? userConfig.autoAssetsName
      : defaultConfig.autoAssetsName,
  }
  return mergedConfig
}
