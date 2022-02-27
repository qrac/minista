import fs from "fs-extra"
import path from "path"
import url from "url"
import { defineConfig, searchForWorkspaceRoot } from "vite"
import type { Plugin } from "vite"
import react from "@vitejs/plugin-react"
import mdx from "@mdx-js/rollup"

import { defaultMdxConfig } from "./mdx.js"

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const defaultViteConfig = defineConfig({
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: `assets/[name].js`,
        //chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
  server: {
    host: true,
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
        find: "react/jsx-runtime",
        replacement: "react/jsx-runtime.js",
      },
    ],
  },
  plugins: [react(), mdx(defaultMdxConfig), virtualHtml()],
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "react/jsx-runtime.js",
      "react-helmet",
    ],
  },
})

export async function getViteConfig() {
  return defaultViteConfig
}

export function virtualHtml(): Plugin {
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

  const sortedTags = tags.sort((a, b) => (a < b ? -1 : 1))
  return sortedTags.join("\n")
}

function getAssetsTag(input: string) {
  !input && ""

  if (input.match(/\.(css|sass|scss)$/)) {
    return `<link rel="stylesheet" href="${input}">`
  } else if (input.match(/\.(js|cjs|mjs|jsx|ts|tsx)$/)) {
    return `<script defer src="${input}"></script>`
  } else {
    console.log(
      "Could not insert the entry [vite.build.rollupOptions.input] into the dev server."
    )
    return ""
  }
}
