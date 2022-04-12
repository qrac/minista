import { defineConfig } from "minista"

//import remarkFrontmatter from "remark-frontmatter"
//import { remarkMdxFrontmatter } from "remark-mdx-frontmatter"

export default defineConfig({
  //base: "/test/",
  //assets: { entry: "src/assets/entry.ts" },
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
