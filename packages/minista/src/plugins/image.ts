import type { Plugin } from "vite"
import path from "node:path"
import fs from "fs-extra"

import type { ResolvedConfig } from "../config/index.js"

export function pluginImage(config: ResolvedConfig): Plugin {
  const tempImageDir = path.join(config.sub.tempDir, "images")

  return {
    name: "minista-vite-plugin:image",
    async buildStart() {
      await fs.remove(tempImageDir)
    },
  }
}
