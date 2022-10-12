import path from "node:path"

export function compileBundleTag({
  fileName,
  bundleCssName,
  base,
}: {
  fileName: string
  bundleCssName: string
  base: string
}) {
  let assetPath = ""

  if (base === "" || base === "./") {
    const filePath = path.dirname(path.join("./", fileName))
    const bundleCssPath = path.join("./", bundleCssName)
    const relativePath = path.relative(filePath, bundleCssPath)
    assetPath = relativePath
  } else {
    assetPath = path.join(base, bundleCssName)
  }
  return `<link rel="stylesheet" href="${assetPath}">`
}
