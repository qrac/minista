import type { MinistaConfig, MinistaUserConfig } from "./types.js"

export const defaultConfig = {
  outDir: "dist",
  publicDir: "public",
  assetsDir: "assets",
  autoAssetsName: "bundle",
  rootFileDir: "src",
  rootFileName: "root",
  rootFileExt: ["jsx", "tsx"],
  pagesDir: "src/pages",
  pagesExt: ["jsx", "tsx", "md", "mdx"],
  tempDir: "node_modules/.minista",
  tempConfigDir: "node_modules/.minista/optimized-config",
  tempViteImporterDir: "node_modules/.minista/vite-importer",
  tempAssetsDir: "node_modules/.minista/bundled-react-assets",
  tempRootFileDir: "node_modules/.minista/bundled-react-root",
  tempPagesDir: "node_modules/.minista/bundled-react-pages",
}

export async function getConfig(
  userConfig: MinistaUserConfig
): Promise<MinistaConfig> {
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
