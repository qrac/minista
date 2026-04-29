import {
  defineConfig,
  pluginSsg,
  pluginMdx,
  pluginBundle,
  pluginEntry,
  pluginSvg,
  pluginIsland,
  pluginSearch,
} from "minista"
import react from "@vitejs/plugin-react"
import remarkGfm from "remark-gfm"
import remarkToc from "remark-toc"
import rehypeSlug from "rehype-slug"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypePrettyCode from "rehype-pretty-code"

import { pluginSeo } from "./minista.local.js"

const remarkTocOptions = {
  maxDepth: 3,
}
const rehypePrettyCodeOptions = {
  grid: false,
  theme: {
    light: "github-light",
    dark: "dracula-soft",
  },
  keepBackground: false,
  keepFigure: false,
}
const preactAlias = {
  react: "preact/compat",
  "react-dom": "preact/compat",
}

export default defineConfig(({ command, isSsrBuild }) => {
  const isDev = command === "serve"
  const isSsr = command === "build" && isSsrBuild
  const isBuild = command === "build" && !isSsrBuild
  return {
    plugins: [
      pluginSsg(),
      pluginMdx({
        remarkPlugins: [remarkGfm, [remarkToc, remarkTocOptions]],
        rehypePlugins: [
          rehypeSlug,
          rehypeAutolinkHeadings,
          [rehypePrettyCode, rehypePrettyCodeOptions],
        ],
      }),
      pluginBundle(),
      pluginEntry(),
      pluginSvg(),
      pluginIsland(),
      pluginSearch({
        src: ["docs/**/*.html"],
        ignoreSelectors: [
          "h1",
          "#table-of-contents",
          "#table-of-contents + ul",
          "[data-rehype-pretty-code-title]",
          "[data-stage]",
        ],
        trimTitle: " - minista",
      }),
      pluginSeo({
        src: ["docs/**/*.html"],
        targetSelector: "[data-search]",
        ignoreSelectors: [
          "h1",
          "#table-of-contents",
          "#table-of-contents + ul",
          "[data-rehype-pretty-code-title]",
          "[data-stage]",
        ],
      }),
      react(),
    ],
    build: {
      assetsInlineLimit: 0,
      rolldownOptions: {
        checks: { pluginTimings: false },
        output: {
          codeSplitting: {
            groups: [
              //{ name: "vendor", test: /\/node_modules\/(?!\.)/ },
              //{ name: "react", test: /\/react(?:-dom)\// },
              //{ name: "preact", test: /\/preact\// },
              //{ name: "minista", test: /\/minista\/src|react-icons\// },
            ],
          },
        },
      },
    },
    resolve: {
      alias: isBuild ? preactAlias : undefined,
    },
  }
})
