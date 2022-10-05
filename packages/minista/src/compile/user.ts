import { build as esBuild } from "esbuild"

import type { UserConfig } from "../config/user.js"
import { external } from "../esbuild/external.js"

export async function compileUserConfig(
  entryPoint: string
): Promise<UserConfig> {
  const compiledCode = await esBuild({
    entryPoints: [entryPoint],
    write: false,
    bundle: true,
    format: "esm",
    platform: "node",
    minify: true,
    plugins: [external()],
  })
  const { default: compiledUserConfig }: { default: UserConfig } = await import(
    `data:text/javascript,${compiledCode.outputFiles[0].text}`
  )
  return compiledUserConfig
}
