import type { Config as SvgoConfig } from "svgo"
import type {
  SvgSource,
  SvgSourceResolver,
} from "../../features/svg/index.js"

export declare class NodeSvgSourceResolver implements SvgSourceResolver {
  constructor(rootDir: string, config?: SvgoConfig)
  resolve(sourcePath: string): Promise<SvgSource | undefined>
}
