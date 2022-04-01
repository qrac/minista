import { defineConfig } from "minista"

//import remarkFrontmatter from "remark-frontmatter"
//import { remarkMdxFrontmatter } from "remark-mdx-frontmatter"

export default defineConfig({
  //base: "/test/",
  assets: { entry: "src/assets/entry.ts" },
  /*vite: {
    esbuild: {
      minify: false,
      minifySyntax: false,
    },
    build: {
      minify: false,
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
  /*beautify: {
    useCss: true,
    useJs: true,
  },*/
})
