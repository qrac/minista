import type { InlineConfig } from "../config/index.js"
import { resolveConfig } from "../config/index.js"
import { generateBundle } from "../generate/bundle.js"
import { generateMain } from "../generate/main.js"

export async function build(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)

  await generateBundle(config)
  await generateMain(config)
}
