import { defineConfig } from "minista"
import remarkDirective from "remark-directive"
import remarkDirectiveRehype from "remark-directive-rehype"
import rehypeSlug from "rehype-slug"
import rehypeAutolinkHeadings from "rehype-autolink-headings"

export default defineConfig({
  assets: {
    partial: {
      usePreact: true,
    },
  },
  search: {
    trimTitle: " - minista",
    include: ["docs/**/*"],
    exclude: ["docs/index"],
  },
  markdown: {
    mdxOptions: {
      remarkPlugins: [remarkDirective, remarkDirectiveRehype],
      rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
    },
  },
})
