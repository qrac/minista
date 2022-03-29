import path from "path"
import { build as esBuild } from "esbuild"

import type { MinistaUserConfig } from "./types.js"

import { tempConfig } from "./config.js"
import { getSameFilePaths } from "./path.js"
import { getFilename, getFilenameObject } from "./utils.js"

export async function getUserConfig(): Promise<MinistaUserConfig> {
  const userConfigPaths = await getSameFilePaths(".", "minista.config", [
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
      outdir: tempConfig.config.outDir,
      bundle: false,
      format: "esm",
      platform: "node",
    }).catch(() => process.exit(1))
    const { default: userConfig } = await import(
      path.resolve(`${tempConfig.config.outDir}/minista.config.mjs`)
    )
    return userConfig ? resolveMinistaUserConfig(userConfig) : {}
  } else {
    return {}
  }
}

export async function resolveMinistaUserConfig(userConfig: MinistaUserConfig) {
  function resolveEntry(entry: string | string[] | {}) {
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

  const entry = userConfig.entry ? userConfig.entry : {}
  const resolvedEntry = resolveEntry(entry)
  const viteEntry =
    typeof userConfig.vite === "object"
      ? userConfig.vite?.build?.rollupOptions?.input
        ? userConfig.vite?.build?.rollupOptions?.input
        : {}
      : {}
  const resolvedViteEntry = resolveEntry(viteEntry)
  const mergedEntry = { ...resolvedEntry, ...resolvedViteEntry }

  const vitePublicDir =
    typeof userConfig.vite === "object"
      ? userConfig.vite.publicDir
        ? userConfig.vite.publicDir
        : "public"
      : "public"
  const viteBuildConfig =
    typeof userConfig.vite === "object"
      ? userConfig.vite.build
        ? userConfig.vite.build
        : {}
      : {}

  const resolved = {
    ...userConfig,
    entry: mergedEntry,
    vite: {
      ...userConfig.vite,
      publicDir: userConfig.publicDir
        ? userConfig.publicDir
        : vitePublicDir
        ? vitePublicDir
        : "public",
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
