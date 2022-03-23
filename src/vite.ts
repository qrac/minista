import type { Plugin, ResolvedConfig } from "vite"
import type { Options as MdxOptions } from "@mdx-js/esbuild"

import fs from "fs-extra"
import path from "path"
import url from "url"
import {
  defineConfig,
  searchForWorkspaceRoot,
  createLogger,
  mergeConfig,
} from "vite"
import react from "@vitejs/plugin-react"
import mdx from "@mdx-js/rollup"
//@ts-ignore
import svgstore from "svgstore"

import type { MinistaUserConfig } from "./types.js"

import { defaultConfig } from "./config.js"

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const imgExt = ["jpg", "jpeg", "gif", "png", "webp", "svg"]
export const fontExt = ["woff", "woff2", "eot", "ttf", "otf"]

export const defaultViteConfig = defineConfig({
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: `${defaultConfig.assetsDir}/[name].js`,
        //chunkFileNames: `${defaultConfig.assetsDir}/[name].js`,
        //assetFileNames: `${defaultConfig.assetsDir}/[name].[ext]`,
        assetFileNames: (chunkInfo) => {
          const fileExtname = chunkInfo.name && path.extname(chunkInfo.name)
          const fileExt = fileExtname && fileExtname.slice(1)

          if (fileExt && imgExt.includes(fileExt)) {
            return `${defaultConfig.assetsDir}/images/[name].[ext]`
          } else if (fileExt && fontExt.includes(fileExt)) {
            return `${defaultConfig.assetsDir}/fonts/[name].[ext]`
          } else {
            return `${defaultConfig.assetsDir}/[name].[ext]`
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
        replacement: path.resolve("node_modules/.minista/"),
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

export async function getViteConfig(
  userConfig: MinistaUserConfig,
  mdxConfig?: MdxOptions
) {
  const mergedConfig = userConfig.vite
    ? mergeConfig(defaultViteConfig, userConfig.vite)
    : defaultViteConfig

  const outDir = userConfig.outDir || defaultConfig.outDir
  const assetsDir = userConfig.assetsDir || defaultConfig.assetsDir
  const iconsDir = userConfig.iconsDir || defaultConfig.iconsDir
  const iconsName = userConfig.iconsName || defaultConfig.iconsName
  const tempIconsDir = defaultConfig.tempIconsDir

  const mergedConfigWithIcons = mergeConfig(mergedConfig, {
    plugins: [
      vitePluginMinistaSvgSpriteIcons(
        {
          inputFolder: iconsDir,
          output: `${outDir}/${assetsDir}/${iconsName}.svg`,
        },
        `${tempIconsDir}/${assetsDir}/${iconsName}.svg`
      ),
    ],
  })
  const mergedConfigWithMdx = mdxConfig
    ? mergeConfig(mergedConfigWithIcons, { plugins: [mdx(mdxConfig)] })
    : mergedConfig
  return mergedConfigWithMdx
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
  options: {
    inputFolder: string
    output: string
  },
  tempOutput: string
): Plugin {
  function getSprite() {
    const sprites = svgstore(options)
    const icons_dir = path.resolve(options.inputFolder)

    for (const file of fs.readdirSync(icons_dir)) {
      const filepath = path.join(icons_dir, file)
      const svgid = path.parse(file).name
      let code = fs.readFileSync(filepath, { encoding: "utf-8" })
      sprites.add(svgid, code)
    }
    return sprites.toString()
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
        fs.outputFileSync(path.resolve(options.output), getSprite())
      }
    },
  }
}
