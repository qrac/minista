import path from "path"
import { defineConfig } from "minista"
import rehypeSlug from "rehype-slug"

//import remarkFrontmatter from "remark-frontmatter"
//import { remarkMdxFrontmatter } from "remark-mdx-frontmatter"

export default defineConfig({
  //base: "./",
  //base: "/test/",
  assets: {
    entry: [
      {
        input: "src/assets/entry.ts",
        insertPages: ["/entry/**/", "/entry/**/*"],
      },
      {
        input: "src/assets/entry.css",
        insertPages: ["/entry/**/", "/entry/**/*"],
      },
    ],
    partial: {
      useSplitPerPage: true,
      //usePreact: true,
      //useIntersectionObserver: false,
    },
    download: {
      //useRemote: true,
    },
  },
  /*vite: {
    build: {
      minify: false,
    },
    esbuild: {
      minify: false,
      minifySyntax: false,
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
