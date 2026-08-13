import type { InlineConfig } from "vite"
import type { ViteAppEnvironmentNames } from "./app-config.js"

export declare function loadViteAppConfig(
  config: InlineConfig,
  names?: ViteAppEnvironmentNames,
  loader?: typeof import("vite").loadConfigFromFile,
): Promise<InlineConfig>
