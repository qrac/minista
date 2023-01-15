import type { ViteDevServer } from "vite"

import type { ResolvedConfig } from "../config/index.js"
import { generateTempSprite } from "../generate/sprite.js"

export async function syncTempSprite({
  fileName,
  srcDir,
  config,
  server,
}: {
  fileName: string
  srcDir: string
  config: ResolvedConfig
  server: ViteDevServer
}) {
  await generateTempSprite({ fileName, srcDir, config })

  const watcher = server.watcher.add(srcDir)

  watcher.on("all", async function (eventName, path) {
    const triggers = ["add", "change", "unlink"]

    if (triggers.includes(eventName) && path.includes(srcDir)) {
      await generateTempSprite({ fileName, srcDir, config })
      server.ws.send({ type: "full-reload" })
    }
  })
}
