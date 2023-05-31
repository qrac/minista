import type { ViteDevServer } from "vite"

import type { ResolvedConfig } from "../config/index.js"
import { generateTempSprite } from "../generate/sprite.js"

export async function syncTempSprite({
  srcDir,
  fileName,
  config,
  server,
}: {
  srcDir: string
  fileName: string
  config: ResolvedConfig
  server: ViteDevServer
}) {
  await generateTempSprite({ srcDir, fileName, config })

  const watcher = server.watcher.add(srcDir)

  watcher.on("all", async function (eventName, path) {
    const triggers = ["add", "change", "unlink"]

    if (triggers.includes(eventName) && path.includes(srcDir)) {
      await generateTempSprite({ srcDir, fileName, config })
      server.ws.send({ type: "full-reload" })
    }
  })
}
