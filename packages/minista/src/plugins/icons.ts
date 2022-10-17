import type { Plugin } from "vite"
import path from "node:path"
import fs from "fs-extra"
import fg from "fast-glob"
import pc from "picocolors"
import { createLogger } from "vite"

import type { ResolvedMainConfig } from "../config/main.js"
import type { ResolvedSubConfig } from "../config/sub.js"
import { compileSpriteIcons } from "../compile/icons.js"

export function pluginIcons({
  mainConfig,
  subConfig,
}: {
  mainConfig: ResolvedMainConfig
  subConfig: ResolvedSubConfig
}): Plugin {
  let command: "build" | "serve"
  let activeSprite = false

  const srcDir = path.join(
    subConfig.resolvedRoot,
    mainConfig.assets.icons.srcDir
  )
  const tempOutput = path.join(
    subConfig.tempDir,
    mainConfig.assets.icons.outName + ".svg"
  )
  const targetPath = path.join(
    "/",
    mainConfig.base,
    mainConfig.assets.icons.outDir,
    mainConfig.assets.icons.outName + ".svg"
  )

  async function buildIcons() {
    const svgFiles = await fg(srcDir + "**/*.svg")

    if (svgFiles.length > 0) {
      const data = compileSpriteIcons({
        svgFiles,
        options: mainConfig.assets.icons.svgstoreOptions,
      })
      return await fs.outputFile(tempOutput, data).catch((err) => {
        console.error(err)
      })
    }
  }

  return {
    name: "minista-vite-plugin:icons",
    async config(_, config) {
      command = config.command
      activeSprite = mainConfig.assets.icons.useSprite && fs.existsSync(srcDir)

      if (activeSprite) {
        return {
          resolve: {
            alias: [
              {
                find: targetPath,
                replacement: tempOutput,
              },
            ],
          },
        }
      }
    },
    async configureServer(server) {
      if (!activeSprite) {
        return
      }
      const watcher = server.watcher.add(srcDir)
      const logger = createLogger()

      watcher.on("all", async function (eventName, path) {
        const triggers = ["add", "change", "unlink"]

        if (triggers.includes(eventName) && path.includes(srcDir)) {
          await buildIcons()

          server.ws.send({ type: "full-reload" })
          logger.info(
            `${pc.bold(pc.green("BUILD"))} ${pc.bold("SVG Sprite Icons")}`
          )
        }
      })
    },
    async buildStart() {
      if (activeSprite) {
        await buildIcons()
      }
      if (command === "build") {
        const code = fs.readFileSync(tempOutput, { encoding: "utf8" })

        this.emitFile({
          fileName: "__minista_plugin_icons.svg",
          name: "__minista_plugin_icons",
          source: code,
          type: "asset",
        })
      }
    },
  }
}
