import type { InlineConfig } from "vite"
import type { ViteAppEnvironmentNames } from "./app-config.js"

export declare class ViteAppConfigPluginMismatchError extends Error {
  readonly code: "MINISTA_VITE_APP_CONFIG_PLUGIN_MISMATCH"
  readonly renderPlugins: readonly string[]
  readonly clientPlugins: readonly string[]
  readonly diagnostic: Readonly<{
    code: "MINISTA_VITE_APP_CONFIG_PLUGIN_MISMATCH"
    severity: "warning"
    message: string
    hint: string
    phase: "analyze"
  }>
  constructor(renderPlugins: readonly string[], clientPlugins: readonly string[])
}

export declare function loadViteAppConfig(
  config: InlineConfig,
  names?: ViteAppEnvironmentNames,
  loader?: typeof import("vite").loadConfigFromFile,
): Promise<InlineConfig>

export declare class ViteAppConfigLegacyEnvironmentError extends Error {
  readonly code: "MINISTA_VITE_APP_CONFIG_LEGACY_ENVIRONMENT"
  readonly diagnostic: import("../../core/diagnostics/index.js").Diagnostic
}
