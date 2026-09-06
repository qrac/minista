import {
  defineConfig,
  pluginSsg,
  pluginEntry,
  pluginSvg,
  pluginIsland,
  pluginSearch,
} from "minista"
import type { Plugin } from "vite"
import react from "@vitejs/plugin-react"
import remarkGfm from "remark-gfm"
import remarkToc from "remark-toc"
import rehypeSlug from "rehype-slug"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypePrettyCode from "rehype-pretty-code"

import { pluginSeo } from "./.vite/plugins/seo.js"

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

function pluginClientPreactAlias(): Plugin {
  return {
    name: "minista-docs:client-preact-alias",
    enforce: "pre",
    apply: "build",
    applyToEnvironment: (environment) =>
      environment.config.consumer === "client",
    resolveId(source, importer, options) {
      for (const [find, replacement] of Object.entries(preactAlias)) {
        if (source !== find && !source.startsWith(`${find}/`)) continue
        const resolvedSource = `${replacement}${source.slice(find.length)}`
        return this.resolve(resolvedSource, importer, {
          ...options,
          skipSelf: true,
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [
    pluginSsg({
      mdx: {
        remarkPlugins: [remarkGfm, [remarkToc, remarkTocOptions]],
        rehypePlugins: [
          rehypeSlug,
          rehypeAutolinkHeadings,
          [rehypePrettyCode, rehypePrettyCodeOptions],
        ],
      },
    }),
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
    pluginClientPreactAlias(),
    react(),
  ],
  build: {
    assetsInlineLimit: 0,
    rolldownOptions: {
      checks: { pluginTimings: false },
    },
  },
})
