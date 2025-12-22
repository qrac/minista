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
import remarkToc from "remark-toc"
import rehypeSlug from "rehype-slug"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypePrettyCode from "rehype-pretty-code"

const remarkTocOptions = {
  maxDepth: 3,
}
const rehypePrettyCodeOptions = {
  theme: {
    light: "github-light",
    dark: "dracula-soft",
  },
  keepBackground: false,
  keepFigure: false,
}

const common = defineConfig({
  plugins: [
    pluginSsg(),
    pluginMdx({
      remarkPlugins: [[remarkToc, remarkTocOptions]],
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
    pluginSearch(),
    react(),
  ],
})

export default defineConfig(({ command, isSsrBuild }) => {
  if (command === "serve") return { ...common }
  if (command === "build" && isSsrBuild)
    return {
      ...common,
      build: {
        assetsInlineLimit: 0,
      },
    }
  if (command === "build" && !isSsrBuild) {
    return {
      ...common,
      build: {
        assetsInlineLimit: 0,
        rollupOptions: {
          output: {
            /*advancedChunks: {
              groups: [
                //{ name: "react", test: /\/react(?:-dom)\// },
                //{ name: "react", test: /\/react\// },
                //{ name: "react-dom", test: /\/react-dom\// },
                { name: "preact", test: /\/preact\// },
                { name: "minista", test: /\/minista\/src\// },
              ],
            },*/
          },
        },
      },
    }
  }
  return { ...common }
})
