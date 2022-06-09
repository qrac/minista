import path from "path"
import { defineConfig } from "minista"

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
    useSearch: true,
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
  beautify: {
    //useHtml: false,
    //useAssets: true,
  },
})
