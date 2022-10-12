import type { RollupOutput } from "rollup"

import type { InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"
import { generateBundle } from "../generate/bundle.js"
import { generateMain } from "../generate/main.js"

export type BuildResult = {
  output: BuildItem[]
}
type BuildItem = RollupOutput["output"][0] & {
  source?: string
  code?: string
}

export async function build(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  await generateBundle(config)
  await generateMain(config)
}
