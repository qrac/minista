import path from "path"
import { build as esBuild } from "esbuild"

import type { MinistaUserConfig } from "./types.js"

import { systemConfig } from "./system.js"
import { getSameFilePaths } from "./path.js"
import { getFilename, getFilenameObject } from "./utils.js"

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
    const { default: userConfig } = await import(
      path.resolve(`${systemConfig.temp.config.outDir}/minista.config.mjs`)
    )
    return userConfig ? resolveUserConfig(userConfig) : {}
  } else {
    return {}
  }
}

export function resolveUserConfig(
  userConfig: MinistaUserConfig
): MinistaUserConfig {
  const entry = userConfig.assets?.entry ? userConfig.assets?.entry : {}
  const resolvedEntry = resolveUserEntry(entry)
  const viteEntry = userConfig.vite?.build?.rollupOptions?.input || {}
  const resolvedViteEntry = resolveUserEntry(viteEntry)
  const mergedEntry = { ...resolvedEntry, ...resolvedViteEntry }

  const viteBase = userConfig.base || userConfig.vite?.base || "/"
  const vitePublicDir =
    userConfig.public || userConfig.vite?.publicDir || "public"
  const viteBuildConfig = userConfig.vite?.build || {}

  const resolved: MinistaUserConfig = {
    ...userConfig,
    base: viteBase,
    assets: { entry: mergedEntry },
    vite: {
      ...userConfig.vite,
      base: viteBase,
      publicDir: vitePublicDir,
      build: {
        ...viteBuildConfig,
        rollupOptions: {
          input: mergedEntry,
        },
      },
    },
  }
  return resolved
}

export function resolveUserEntry(entry: string | string[] | {}): {} {
  const result1 =
    typeof entry === "object"
      ? entry
      : typeof entry === "string"
      ? { [getFilename(entry)]: entry }
      : Array.isArray(entry)
      ? getFilenameObject(entry)
      : {}
  const result2 = Object.entries(result1)
  const result3 =
    result2.length > 0
      ? result2.map((item) => {
          const strUrl = item[1] as string
          const rootUrl = strUrl.startsWith("./")
            ? strUrl.replace(/^\.\//, "")
            : strUrl.startsWith("/")
            ? strUrl.replace(/^\//, "")
            : strUrl
          return [item[0], rootUrl]
        })
      : result2
  const result4 = Object.fromEntries(result3)
  return result4
}
