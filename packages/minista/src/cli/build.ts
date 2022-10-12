import type { RollupOutput } from "rollup"
import path from "node:path"
import fs from "fs-extra"

import type { InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"
import { compileMain } from "../compile/main.js"
import { compileBundle } from "../compile/bundle.js"
import { generatePublic } from "../generate/public.js"
import { generateMain } from "../generate/main.js"
import { generateBundle } from "../generate/bundle.js"

export type BuildResult = {
  output: BuildItem[]
}
export type BuildItem = RollupOutput["output"][0] & {
  source?: string
  code?: string
}

export async function build(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  const resolvedOut = path.join(config.sub.resolvedRoot, config.main.out)
  const resolvedPublic = path.join(config.sub.resolvedRoot, config.main.public)

  const mainItems = await compileMain(config)
  const bundleItems = await compileBundle(config)

  if (mainItems.length === 0) {
    return console.log("No content to build.")
  }
  await fs.emptyDir(resolvedOut)
  await generatePublic(resolvedPublic, resolvedOut)

  await Promise.all([
    generateMain({ config, mainItems }),
    generateBundle({ config, bundleItems }),
  ])
}
