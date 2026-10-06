import type {
  Environment,
  IndexHtmlTransformContext,
  ViteDevServer,
} from "vite"

export declare class ViteDevServerRegistry {
  add(server: ViteDevServer): void
  delete(server: ViteDevServer): void
  resolve(context: IndexHtmlTransformContext): ViteDevServer | undefined
  resolveEnvironment(environment: Environment): ViteDevServer | undefined
}
