import type { InlineConfig, ViteBuilder } from "vite"

export declare class ViteEnvironmentNotFoundError extends Error {
  readonly code: "MINISTA_VITE_ENVIRONMENT_NOT_FOUND"
}
export declare class LegacyViteBuilderAdapter {
  constructor(
    factory?: (
      config: InlineConfig,
      useLegacyBuilder: true,
    ) => Promise<ViteBuilder>,
  )
  build(config: InlineConfig): ReturnType<ViteBuilder["build"]>
}
