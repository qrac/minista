import type { Plugin } from "vite"
import path from "node:path"
import fs from "fs-extra"
import fg from "fast-glob"

import type { ResolvedMainConfig } from "../config/main.js"
import type { ResolvedSubConfig } from "../config/sub.js"
import { compileSvgSprite } from "../compile/sprite.js"

export function pluginIcons({
  mainConfig,
  subConfig,
}: {
  mainConfig: ResolvedMainConfig
  subConfig: ResolvedSubConfig
}): Plugin {
  let activeSprite = false

  const srcDir = path.join(
    subConfig.resolvedRoot,
    mainConfig.assets.icons.srcDir
  )
  const tempOutput = path.join(subConfig.tempDir, "__minista_plugin_icons.svg")

  async function buildIcons() {
    const svgFiles = await fg(srcDir + "**/*.svg")

    if (svgFiles.length > 0) {
      const data = compileSvgSprite({
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
    async configResolved() {
      activeSprite = mainConfig.assets.icons.useSprite && fs.existsSync(srcDir)

      if (activeSprite) {
        await buildIcons()
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
          await buildIcons()
        }
      })
    },
  }
}
