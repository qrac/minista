import { defineConfig } from "minista"

export default defineConfig({
  delivery: {
    include: ["/test/", "/test/*", "/test/**/*"],
    archives: [
      {
        srcDir: "dist",
        outDir: "",
        outName: "archive",
        format: "zip",
        options: {
          zlib: { level: 9 },
        },
        button: {
          title: "Download",
          //color: "blue",
        },
      },
    ],
  },
})
