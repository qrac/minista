import type { UserConfig as ViteConfig, Plugin, ResolvedConfig } from "vite"

import fs from "fs-extra"
import path from "path"
import url from "url"
import {
  defineConfig as defineViteConfig,
  searchForWorkspaceRoot,
  createLogger,
  mergeConfig as mergeViteConfig,
} from "vite"
import react from "@vitejs/plugin-react"
import mdx from "@mdx-js/rollup"
//@ts-ignore
import svgstore from "svgstore"

import type { MinistaResolveConfig, MinistaSvgstoreOptions } from "./types.js"

import { systemConfig } from "./system.js"
import { getFilename, getFilenameObject } from "./utils.js"

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function getViteConfig(
  config: MinistaResolveConfig
): Promise<ViteConfig> {
  const imgExt = ["jpg", "jpeg", "gif", "png", "webp", "svg"]
  const fontExt = ["woff", "woff2", "eot", "ttf", "otf"]

  const viteConfig = defineViteConfig({
    base: config.base || "/",
    publicDir: config.public || "public",
    build: {
      outDir: config.out || config.vite.build?.outDir || "dist",
      assetsInlineLimit: 0,
      rollupOptions: {
        input: config.assets.entry
          ? resolveEntry(config.assets.entry)
          : config.vite.build?.rollupOptions?.input
          ? resolveEntry(config.vite.build?.rollupOptions?.input)
          : "",
        output: {
          manualChunks: undefined,
          entryFileNames: `${config.assets.outDir}/${config.assets.outName}.js`,
          //chunkFileNames: `${config.assets.outDir}/${config.assets.outName}.js`,
          //assetFileNames: `${config.assets.outDir}/${config.assets.outName}.[ext]`,
          assetFileNames: (chunkInfo) => {
            const fileExtname = chunkInfo.name && path.extname(chunkInfo.name)
            const fileExt = fileExtname && fileExtname.slice(1)

            if (fileExt && imgExt.includes(fileExt)) {
              return config.viteAssetsImagesOutput
            } else if (fileExt && fontExt.includes(fileExt)) {
              return config.viteAssetsFontsOutput
            } else {
              return config.viteAssetsOutput
            }
          },
        },
      },
    },
    server: {
      fs: {
        allow: [
          searchForWorkspaceRoot(process.cwd()),
          path.resolve(__dirname + "/../"),
          path.resolve(systemConfig.temp.icons.outDir),
        ],
      },
    },
    resolve: {
      alias: [
        {
          find: "/@minista",
          replacement: path.resolve(__dirname + "/../"),
        },
        {
          find: "/@minista-temp",
          replacement: path.resolve(systemConfig.temp.out),
        },
        {
          find: "react/jsx-runtime",
          replacement: "react/jsx-runtime.js",
        },
      ],
    },
    plugins: [react(), vitePluginMinistaVirtualHtml()],
    optimizeDeps: {
      //entries: path.resolve(__dirname + "/../lib/index.html"),
      include: [
        "minista",
        "react",
        "react-dom",
        "react-router-dom",
        "react/jsx-runtime.js",
        "react-helmet",
      ],
    },
    customLogger: createLogger("info", { prefix: "[minista]" }),
  })

  const mergedViteConfig = mergeViteConfig(viteConfig, config.vite)

  if (config.assets.icons.useSprite) {
    const iconsPlugin = vitePluginMinistaSvgSpriteIcons(
      config.vitePluginSvgSpriteIconsSrcDir,
      config.out + config.vitePluginSvgSpriteIconsOutput,
      config.assets.icons.svgstoreOptions,
      config.vitePluginSvgSpriteIconsTempOutput
    )
    const iconsResolveAlias = {
      find: config.vitePluginSvgSpriteIconsOutput,
      replacement: path.resolve(config.vitePluginSvgSpriteIconsTempOutput),
    }
    mergedViteConfig.plugins.push(iconsPlugin)
    mergedViteConfig.resolve.alias.push(iconsResolveAlias)
  }

  const mdxPlugin = mdx(config.markdown.mdxOptions)
  mergedViteConfig.plugins.push(mdxPlugin)

  return mergedViteConfig
}

export function resolveEntry(entry: string | string[] | {}): {} {
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

export function vitePluginMinistaVirtualHtml(): Plugin {
  function getAssetsTagStr(input: any) {
    !input && ""
    const tags = []
    if (typeof input === "string") {
      const tag = getAssetsTag(input)
      tags.push(tag)
    } else if (Array.isArray(input) && input.length > 0) {
      input.map((item) => {
        const tag = getAssetsTag(item)
        return tags.push(tag)
      })
    } else if (typeof input === "object") {
      Object.values(input).map((item) => {
        const tag = typeof item === "string" ? getAssetsTag(item) : ""
        return tags.push(tag)
      })
    }
    const sortedTags =
      tags.length >= 2
        ? tags
            .filter((item): item is string => !!item)
            .sort((a, b) => (a < b ? -1 : 1))
        : tags
    return sortedTags.join("\n")
  }

  function getAssetsTag(input: string) {
    !input && ""
    if (input.match(/\.(css|sass|scss)$/)) {
      return `<link rel="stylesheet" href="/${input}">`
    } else if (input.match(/\.(js|cjs|mjs|jsx|ts|tsx)$/)) {
      return //`<script defer type="module" src="/${input}"></script>`
    } else {
      console.log(
        "Could not insert the entry [vite.build.rollupOptions.input] into the dev server."
      )
      return ""
    }
  }
  return {
    name: "vite-plugin-minista-virtual-html",
    configureServer(server) {
      return () => {
        const ministaHtmlURL = new URL(
          path.resolve(__dirname + "/../lib/index.html"),
          import.meta.url
        )
        const ministaHtml = fs.readFileSync(ministaHtmlURL, "utf8")
        const assetTagStr = getAssetsTagStr(
          server.config.inlineConfig.build?.rollupOptions?.input
        )
        const ministaReplacedHtml = ministaHtml.replace(
          "<!-- VIRTUAL_HTML_ASSETS_TAG -->",
          assetTagStr
        )

        server.middlewares.use((req, res, next) => {
          if (req.url!.endsWith(".html")) {
            res.statusCode = 200
            res.end(ministaReplacedHtml)
            return
          }
          next()
        })
      }
    },
  }
}

/*! Fork: rollup-plugin-svg-icons | https://github.com/AlexxNB/rollup-plugin-svg-icons */
export function vitePluginMinistaSvgSpriteIcons(
  inputFolder: string,
  output: string,
  options: MinistaSvgstoreOptions = {},
  tempOutput: string
): Plugin {
  function getSprite() {
    const sprites = svgstore({ inputFolder, output })
    const icons_dir = path.resolve(inputFolder)

    for (const file of fs.readdirSync(icons_dir)) {
      const filepath = path.join(icons_dir, file)
      const svgid = path.parse(file).name
      let code = fs.readFileSync(filepath, { encoding: "utf-8" })
      sprites.add(svgid, code, options)
    }
    return sprites
      .toString({ inline: true })
      .replace(
        `<svg>`,
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`
      )
  }

  let config: ResolvedConfig
  return {
    name: "vite-plugin-minista-svg-sprite-icons",
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    buildStart() {
      if (config.command === "serve") {
        fs.outputFileSync(path.resolve(tempOutput), getSprite())
      } else {
        fs.outputFileSync(path.resolve(output), getSprite())
      }
    },
  }
}
