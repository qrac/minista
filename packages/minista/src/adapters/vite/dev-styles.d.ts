import type { HtmlTagDescriptor, ViteDevServer } from "vite"

export declare function getViteDevStyles(
  server: ViteDevServer,
  sourceFiles: readonly string[],
): HtmlTagDescriptor[]
