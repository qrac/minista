import type {
  Environment,
  RunnableDevEnvironment,
  ViteDevServer,
} from "vite"
import type { Diagnostic, ModuleEvaluator } from "../../core/index.js"

export declare class ViteDevEnvironmentNotRunnableError extends Error {
  readonly code: "MINISTA_VITE_DEV_ENVIRONMENT_NOT_RUNNABLE"
  readonly diagnostic: Diagnostic
  constructor(environmentName: string)
}
export declare class ViteDevModuleEvaluator implements ModuleEvaluator {
  constructor(
    server: ViteDevServer,
    environmentName?: string,
    guard?: (
      environment: Environment,
    ) => environment is RunnableDevEnvironment,
  )
  importModule<Exports = Record<string, unknown>>(
    moduleId: string,
  ): Promise<Exports>
  invalidateModule(moduleId: string): boolean
  fixStacktrace(error: Error): Error
}
