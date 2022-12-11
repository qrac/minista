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

import type { ResolvedMainConfig } from "./main.js"
import type { ResolvedSubConfig } from "./sub.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export type ResolvedViteConfig = ViteConfig

export function resolveViteAssetFileNames(
  chunkInfo: PreRenderedAsset,
  mainConfig: ResolvedMainConfig
) {
  const filePath = chunkInfo.name || ""
  const fileExt = path.extname(filePath)

  if (filePath.includes("__minista_plugin_sprite.svg")) {
    return path.join(
      mainConfig.assets.icons.outDir,
      mainConfig.assets.icons.outName + ".svg"
    )
  }
  if (fileExt.match(/\.(jpg|jpeg|gif|png|webp|svg)/)) {
    return path.join(
      mainConfig.assets.images.outDir,
      mainConfig.assets.images.outName + ".[ext]"
    )
  }
  if (fileExt.match(/\.(woff|woff2|eot|ttf|otf)/)) {
    return path.join(
      mainConfig.assets.fonts.outDir,
      mainConfig.assets.fonts.outName + ".[ext]"
    )
  }
  return path.join(
    mainConfig.assets.outDir,
    mainConfig.assets.outName + ".[ext]"
  )
}

export async function resolveViteConfig(
  mainConfig: ResolvedMainConfig,
  subConfig: ResolvedSubConfig
): Promise<ResolvedViteConfig> {
  const defaultViteConfig = defineViteConfig({
    root: mainConfig.root,
    base: mainConfig.base,
    publicDir: mainConfig.public,
    build: {
      outDir: mainConfig.out,
      assetsInlineLimit: 0,
      //cssCodeSplit: false,
      minify: !mainConfig.beautify.useAssets,
      rollupOptions: {
        output: {
          manualChunks: undefined,
          entryFileNames: path.join(
            mainConfig.assets.outDir,
            mainConfig.assets.outName + ".js"
          ),
          assetFileNames: (chunkInfo) =>
            resolveViteAssetFileNames(chunkInfo, mainConfig),
        },
        onwarn: (warning, defaultHandler) => {
          if (warning.code === "EMPTY_BUNDLE") return
          defaultHandler(warning)
        },
      },
      //commonjsOptions: { include: [] }, // Using esbuild deps optimization at build time
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
          path.resolve(subConfig.tempDir),
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
          find: "/@minista-project-root",
          replacement: path.resolve(subConfig.resolvedRoot),
        },
        {
          find: "/@minista-temp",
          replacement: path.resolve(subConfig.tempDir),
        },
      ],
    },
    optimizeDeps: {
      //disabled: false, // Using esbuild deps optimization at build time
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
  return mergedViteConfig
}
