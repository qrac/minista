import type { ResolvedConfig } from "vite"
import type { RenderedPage } from "../../features/ssg/index.js"

export declare function composeViteSsgPublicAssets(
  pages: readonly RenderedPage[],
  config: ResolvedConfig,
  entrySources: ReadonlySet<string>,
): Promise<readonly RenderedPage[]>
