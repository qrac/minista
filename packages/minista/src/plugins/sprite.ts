import type { Plugin } from "vite"
import type { SvgstoreAddOptions } from "@qrac/svgstore"
import path from "node:path"
import fs from "fs-extra"
import fg from "fast-glob"
import svgstore from "@qrac/svgstore"

import type { ResolvedConfig } from "../config/index.js"

function compileSvgSprite({
  svgFiles,
  options,
}: {
  svgFiles: string[]
  options: SvgstoreAddOptions
}) {
  const sprites = svgstore()

  for (const svgFile of svgFiles) {
    const svgId = path.parse(svgFile).name
    const code = fs.readFileSync(svgFile, { encoding: "utf8" })
    sprites.add(svgId, code, options)
  }
  return sprites
    .toString({ inline: true })
    .replace(
      `<svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`
    )
}

async function buildSvgSprite({
  srcDir,
  output,
  options,
}: {
  srcDir: string
  output: string
  options: SvgstoreAddOptions
}) {
  const svgFiles = await fg(srcDir + "**/*.svg")

  if (svgFiles.length > 0) {
    const data = compileSvgSprite({
      svgFiles,
      options,
    })
    return await fs.outputFile(output, data).catch((err) => {
      console.error(err)
    })
  }
}

export function pluginSprite(
  config: ResolvedConfig,
  useInit?: boolean
): Plugin {
  let command: "build" | "serve"
  let activeSprite = false

  const srcDir = path.join(
    config.sub.resolvedRoot,
    config.main.assets.icons.srcDir
  )
  const output = path.join(config.sub.tempDir, "__minista_plugin_sprite.svg")
  const options = config.main.assets.icons.svgstoreOptions

  return {
    name: "minista-vite-plugin:sprite",
    config(_, viteConfig) {
      command = viteConfig.command
      activeSprite = config.main.assets.icons.useSprite && fs.existsSync(srcDir)

      if (activeSprite) {
        return {
          resolve: {
            alias: [
              {
                find: "/@minista-temp/__minista_plugin_sprite.svg",
                replacement: output,
              },
            ],
          },
        }
      }
    },
    async buildStart() {
      if (useInit) {
        await fs.remove(output)
        activeSprite && (await buildSvgSprite({ srcDir, output, options }))
      }
    },
    async configureServer(server) {
      if (!activeSprite) {
        return
      }
      const watcher = server.watcher.add(srcDir)

      watcher.on("all", async function (eventName, path) {
        const triggers = ["add", "change", "unlink"]

        if (triggers.includes(eventName) && path.includes(srcDir)) {
          await buildSvgSprite({ srcDir, output, options })
        }
      })
    },
    transform(code, id) {
      if (
        command === "build" &&
        activeSprite &&
        id.match(/minista(\/|\\)dist(\/|\\)shared(\/|\\)icon\.js$/)
      ) {
        const addImport = `import tempSpriteUrl from "/@minista-temp/__minista_plugin_sprite.svg";\n`
        const replacedCode = code.replace(
          `"/@minista-temp/__minista_plugin_sprite.svg#"`,
          `tempSpriteUrl + "#"`
        )
        return {
          code: addImport + replacedCode,
          map: null,
        }
      }
    },
  }
}
