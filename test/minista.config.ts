import { defineConfig } from "minista"

//import remarkFrontmatter from "remark-frontmatter"
//import { remarkMdxFrontmatter } from "remark-mdx-frontmatter"

export default defineConfig({
  entry: "src/assets/script.ts",
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
    remarkPlugins: [
      remarkFrontmatter,
      [remarkMdxFrontmatter, { name: "frontmatter" }],
    ],
  },*/
  /*beautify: {
    useCss: true,
    useJs: true,
  },*/
})
