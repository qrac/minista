import { build as esBuild } from "esbuild"

import path from "node:path"
import fs from "fs-extra"
import type { UserConfig } from "../config/user.js"
import { external } from "../esbuild/external.js"

export async function compileUserConfig(
  entryPoint: string
): Promise<UserConfig> {
  const entryBase = path.basename(entryPoint)
  const tempEntryPoint = entryPoint.replace(entryBase, "__minista.config.mjs")

  await esBuild({
    entryPoints: [entryPoint],
    outfile: tempEntryPoint,
    bundle: true,
    format: "esm",
    platform: "node",
    minify: false,
    plugins: [external()],
  }).catch((err) => {
    console.error(err)
  })

  const { default: compiledUserConfig }: { default: UserConfig } = await import(
    tempEntryPoint
  )
  await fs.remove(tempEntryPoint)
  return compiledUserConfig
}
