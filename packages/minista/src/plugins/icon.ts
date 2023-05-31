import type { Plugin } from "vite"
import path from "node:path"
import fs from "fs-extra"

import type { ResolvedConfig } from "../config/index.js"

export function pluginIcon(config: ResolvedConfig): Plugin {
  const tempIconDir = path.join(config.sub.tempDir, "icons")

  return {
    name: "minista-vite-plugin:icon",
    async buildStart() {
      await fs.remove(tempIconDir)
    },
  }
}
