import type { Diagnostic } from "../../core/index.js"
import type { EnvironmentModuleNode, ViteDevServer } from "vite"

export declare class ViteDevEnvironmentMissingError extends Error {
  readonly code: "MINISTA_VITE_DEV_ENVIRONMENT_MISSING"
  readonly diagnostic: Diagnostic
  constructor(environmentName: string)
}

export declare class ViteDevUpdateAdapter {
  constructor(server: ViteDevServer)
  hasModule(
    environmentName: string,
    reference: { id?: string | null; file?: string | null },
  ): boolean
  invalidateModuleById(
    environmentName: string,
    moduleId: string,
    timestamp: number,
    hardInvalidate?: boolean,
  ): boolean
  invalidateModules(
    environmentName: string,
    modules: readonly EnvironmentModuleNode[],
    timestamp: number,
    hardInvalidate?: boolean,
  ): void
  findAffectedFiles(
    modules: readonly EnvironmentModuleNode[],
    candidateFiles: readonly string[],
  ): readonly string[]
  fullReload(environmentName?: string): void
  reloadPages(paths: readonly string[], environmentName?: string): void
}
