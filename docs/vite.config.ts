import {
  defineConfig,
  pluginSsg,
  pluginSvg,
  pluginIsland,
  pluginSearch,
} from "minista"
import react from "@vitejs/plugin-react"
import remarkGfm from "remark-gfm"
import remarkCustomHeaderId from "remark-custom-header-id"
import remarkToc from "remark-toc"
import rehypeSlug from "rehype-slug"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypePrettyCode from "rehype-pretty-code"

import { pluginSeo } from "./.vite-plugins/seo.js"
import { pluginPreact } from "./.vite-plugins/preact.js"

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

export default defineConfig({
  plugins: [
    pluginSsg({
      mdx: {
        remarkPlugins: [
          remarkGfm,
          remarkCustomHeaderId,
          [remarkToc, remarkTocOptions],
        ],
        rehypePlugins: [
          rehypeSlug,
          rehypeAutolinkHeadings,
          [rehypePrettyCode, rehypePrettyCodeOptions],
        ],
      },
    }),
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
    pluginPreact(),
    react(),
  ],
  build: {
    assetsInlineLimit: 0,
    rolldownOptions: {
      checks: { pluginTimings: false },
    },
  },
})
