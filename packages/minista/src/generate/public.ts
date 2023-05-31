import path from "node:path"
import fs from "fs-extra"

import type { ResolvedConfig } from "../config/index.js"

export async function generatePublics({ config }: { config: ResolvedConfig }) {
  const { resolvedRoot } = config.sub
  const resolvedOut = path.join(resolvedRoot, config.main.out)
  const resolvedPublic = path.join(resolvedRoot, config.main.public)

  if (!(await fs.pathExists(resolvedPublic))) {
    return
  }
  await fs.copy(resolvedPublic, resolvedOut)
}
