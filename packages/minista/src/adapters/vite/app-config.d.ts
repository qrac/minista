import type { InlineConfig, Plugin } from "vite"

export interface ViteAppEnvironmentNames {
  readonly renderName?: string
  readonly clientName?: string
}

export declare const MINISTA_APP_BUILD_KEY: "__ministaAppBuild"
export declare function getViteAppEnvironmentNames(
  config: unknown,
): Required<ViteAppEnvironmentNames> | undefined
export declare function isViteAppClientEnvironment(
  environment: Parameters<NonNullable<Plugin["applyToEnvironment"]>>[0],
): boolean

export declare function createViteAppConfig(
  config: InlineConfig,
  names?: ViteAppEnvironmentNames,
): InlineConfig
