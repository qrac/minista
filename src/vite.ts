import fs from "fs-extra"
import path from "path"
import url from "url"
import { searchForWorkspaceRoot } from "vite"
import type { Plugin } from "vite"
import react from "@vitejs/plugin-react"
import mdx from "@mdx-js/rollup"

import { defaultMdxConfig } from "./mdx.js"

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const defaultViteConfig = {
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
}

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

        server.middlewares.use((req, res, next) => {
          if (req.url!.endsWith(".html")) {
            res.statusCode = 200
            res.end(ministaHtml)
            return
          }
          next()
        })
      }
    },
  }
}
