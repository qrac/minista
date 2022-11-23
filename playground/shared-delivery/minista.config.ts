import { defineConfig } from "minista"

export default defineConfig({
  delivery: {
    include: ["/test/**/*"],
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
          text: "Download",
          //color: "blue",
        },
      },
    ],
  },
})
