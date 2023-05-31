import path from "node:path"

export function resolveBase(base: string) {
  if (base === "/" || base === "./") {
    return "/"
  }

  let fixBase = base
  base.startsWith("./") && (fixBase = fixBase.replace("./", "/"))
  !base.startsWith("/") && (fixBase = path.join("/", fixBase))
  !base.endsWith("/") && (fixBase = path.join(fixBase, "/"))
  return fixBase
}
