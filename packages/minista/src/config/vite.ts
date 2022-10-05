import path from "node:path"
import { fileURLToPath } from "node:url"
import type { UserConfig as ViteConfig } from "vite"
import type { PreRenderedAsset } from "rollup"
import {
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
  searchForWorkspaceRoot,
  createLogger,
} from "vite"
import react from "@vitejs/plugin-react"
import mdx from "@mdx-js/rollup"

import type { ResolvedMainConfig } from "./main.js"
import type { ResolvedSubConfig } from "./sub.js"
import type { ResolvedMdxConfig } from "./mdx.js"
import type { ResolvedEntry } from "./entry.js"
import { systemConfig } from "./system.js"
import { getFileExt } from "../utility/path.js"
import { svgr } from "../vite/svgr.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export type ResolvedViteConfig = ViteConfig
export type ResolvedViteEntry = { [key: string]: string } | string

export function resolveViteEntry(entry: ResolvedEntry): ResolvedViteEntry {
  if (!entry.length) {
    return ""
  }
  const entries = Object.fromEntries(
    entry.map((item) => [item.name, item.input])
  )
  return entries
}

export function resolveViteAssetFileNames(
  chunkInfo: PreRenderedAsset,
  mainConfig: ResolvedMainConfig
) {
  const filePath = chunkInfo.name || ""
  const imgExt = ["jpg", "jpeg", "gif", "png", "webp"]
  const fontExt = ["woff", "woff2", "eot", "ttf", "otf"]
  const fileExt = getFileExt(filePath)

  if (fileExt && imgExt.includes(fileExt)) {
    return path.join(
      mainConfig.assets.images.outDir,
      mainConfig.assets.images.outName + ".[ext]"
    )
  } else if (fileExt && fontExt.includes(fileExt)) {
    return path.join(
      mainConfig.assets.fonts.outDir,
      mainConfig.assets.fonts.outName + ".[ext]"
    )
  } else {
    return path.join(
      mainConfig.assets.outDir,
      mainConfig.assets.outName + ".[ext]"
    )
  }
}

export async function resolveViteConfig(
  mainConfig: ResolvedMainConfig,
  subConfig: ResolvedSubConfig,
  mdxConfig: ResolvedMdxConfig
): Promise<ResolvedViteConfig> {
  const defaultViteConfig = defineViteConfig({
    root: mainConfig.root,
    base: mainConfig.base,
    publicDir: mainConfig.public,
    build: {
      outDir: mainConfig.out,
      assetsInlineLimit: 0,
      minify: !mainConfig.beautify.useAssets,
      rollupOptions: {
        input: resolveViteEntry(subConfig.resolvedEntry),
        output: {
          manualChunks: undefined,
          entryFileNames: `${mainConfig.assets.outDir}/${mainConfig.assets.outName}.js`,
          //chunkFileNames: `${config.assets.outDir}/${config.assets.outName}.js`,
          //assetFileNames: `${config.assets.outDir}/${config.assets.outName}.[ext]`,
          assetFileNames: (chunkInfo) =>
            resolveViteAssetFileNames(chunkInfo, mainConfig),
        },
      },
      commonjsOptions: { include: [] }, // Using esbuild deps optimization at build time
    },
    esbuild: {
      minifySyntax: !mainConfig.beautify.useAssets,
    },
    server: {
      watch: {
        usePolling: true,
        interval: 100,
      },
      fs: {
        allow: [
          searchForWorkspaceRoot(process.cwd()),
          path.resolve(__dirname + "/../../"),
          path.resolve(systemConfig.temp.icons.outDir),
        ],
      },
    },
    resolve: {
      alias: [
        {
          find: "/@minista",
          replacement: path.resolve(__dirname + "/../../"),
        },
        {
          find: "/@minista-temp",
          replacement: path.resolve(systemConfig.temp.out),
        },
      ],
    },
    plugins: [react()],
    optimizeDeps: {
      disabled: false, // Using esbuild deps optimization at build time
    },
    customLogger: createLogger("info", { prefix: "[minista]" }),
    css: mainConfig.css,
  })

  const mainViteConfig = Object.assign({}, mainConfig.vite)
  delete mainViteConfig.build?.rollupOptions?.input
  const mergedViteConfig = mergeViteConfig(defaultViteConfig, mainViteConfig)

  if (subConfig.resolvedAlias.length > 0) {
    await Promise.all(
      subConfig.resolvedAlias.map(async (item) => {
        return mergedViteConfig.resolve.alias.push(item)
      })
    )
  }

  const svgrPlugin = svgr(mainConfig.assets.svgr.svgrOptions)
  mergedViteConfig.plugins.push(svgrPlugin)

  const mdxPlugin = mdx(mdxConfig)
  mergedViteConfig.plugins.push(mdxPlugin)

  return mergedViteConfig
}
