import path from "path"
import url from "url"
import { build as esBuild } from "esbuild"

import type { MinistaUserConfig } from "./types.js"

import { systemConfig } from "./system.js"
import { getSameFilePaths } from "./path.js"

export async function getUserConfig(
  cofigPath: string = "."
): Promise<MinistaUserConfig> {
  const userConfigPaths = await getSameFilePaths(cofigPath, "minista.config", [
    "js",
    "cjs",
    "mjs",
    "jsx",
    "ts",
    "tsx",
    "json",
  ])
  if (Array.isArray(userConfigPaths) && userConfigPaths.length > 0) {
    await esBuild({
      entryPoints: [userConfigPaths[0]],
      outExtension: { ".js": ".mjs" },
      outdir: path.resolve(systemConfig.temp.config.outDir),
      bundle: false,
      format: "esm",
      platform: "node",
    }).catch(() => process.exit(1))
    const userConfigPath = path.resolve(
      `${systemConfig.temp.config.outDir}/minista.config.mjs`
    )
    const userConfigFilePath = url.pathToFileURL(userConfigPath).href
    const { default: userConfig } = await import(userConfigFilePath)
    return userConfig || {}
  } else {
    return {}
  }
}
