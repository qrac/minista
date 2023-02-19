import path from "node:path"
import fs from "fs-extra"

import type { ResolvedConfig } from "../config/index.js"
import { logger } from "../cli/logger.js"

export async function generateTempSearch({
  data,
  config,
}: {
  data: string
  config: ResolvedConfig
}) {
  const { resolvedRoot, tempDir } = config.sub
  const fileName = path.join(tempDir, "__minista_plugin_search.json")
  const filePath = fileName.replace(resolvedRoot, "")
  const hasTempFile = await fs.pathExists(fileName)

  if (!data || hasTempFile) {
    return
  }
  await fs
    .outputFile(fileName, data)
    .then(() => {
      logger({ label: "BUILD", main: filePath })
    })
    .catch((err) => {
      console.error(err)
    })
}
