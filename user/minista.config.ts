import path from "path"
import { defineConfig } from "minista"
import rehypeSlug from "rehype-slug"

//import remarkFrontmatter from "remark-frontmatter"
//import { remarkMdxFrontmatter } from "remark-mdx-frontmatter"

export default defineConfig({
  //base: "/test/",
  assets: {
    entry: "src/assets/entry.ts",
    partial: {
      usePreact: true,
      //useIntersectionObserver: false,
    },
  },
  /*assets: {
    download: {
      useRemote: true,
    },
  },*/
  /*vite: {
    build: {
      minify: false,
    },
    esbuild: {
      minify: false,
      minifySyntax: false,
    },
  },*/
  /*vite: {
    resolve: {
      alias: [{ find: "~", replacement: path.resolve("src") }],
    },
  },*/
  resolve: {
    alias: [{ find: "~/", replacement: path.resolve("src") + "/" }],
  },
  search: {
    useJson: true,
    trimTitle: " - minista",
    include: ["search/posts/**/*"],
    //exclude: ["search/index"],
  },
  /*markdown: {
    syntaxHighlighter: "none",
    //syntaxHighlighter: "highlight",
    //mdxOptions: {
    //  remarkPlugins: [
    //    remarkFrontmatter,
    //    [remarkMdxFrontmatter, { name: "frontmatter" }],
    //  ],
    //}
  },*/
  markdown: {
    mdxOptions: {
      rehypePlugins: [rehypeSlug],
    },
  },
  beautify: {
    //useHtml: false,
    //useAssets: true,
  },
})
