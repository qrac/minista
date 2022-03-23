import type { MinistaConfig, MinistaUserConfig } from "./types.js"

export const defaultConfig: MinistaConfig = {
  outDir: "dist",
  assetsDir: "assets",
  bundleName: "bundle",
  iconsDir: "src/assets/icons",
  iconsName: "icons",
  publicDir: "public",
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
  tempIconsDir: "node_modules/.minista/svg-sprite-icons",
}

export async function getConfig(
  userConfig: MinistaUserConfig
): Promise<MinistaConfig> {
  const mergedConfig = {
    ...defaultConfig,
    outDir: userConfig.outDir || defaultConfig.outDir,
    assetsDir: userConfig.assetsDir || defaultConfig.assetsDir,
    bundleName: userConfig.bundleName || defaultConfig.bundleName,
    iconsDir: userConfig.iconsDir || defaultConfig.iconsDir,
    iconsName: userConfig.iconsName || defaultConfig.iconsName,
    publicDir: userConfig.publicDir || defaultConfig.publicDir,
  }
  return mergedConfig
}
