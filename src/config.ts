export const defaultConfig = {
  entries: [],
  outDir: "dist",
  publicDir: "public",
  assetsDir: "assets",
  autoAssetsName: "bundle",
  tempAssetsDir: "node_modules/.minista/bundled-react-assets",
  rootFileDir: "src",
  rootFileName: "root",
  rootFileExt: ["js", "jsx", "ts", "tsx"],
  tempRootFileDir: "node_modules/.minista/bundled-react-root",
  pagesDir: "src/pages",
  pagesExt: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  tempPagesDir: "node_modules/.minista/bundled-react-pages",
}

export async function getConfig() {
  return defaultConfig
}
