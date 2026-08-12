import type { Config as SvgoConfig } from "svgo"
import type { SpriteBuilder } from "../../features/sprite/index.js"

export declare class NodeSpriteBuilder implements SpriteBuilder {
  constructor(rootDir: string, config?: SvgoConfig)
  build(sourceDirectory: string): Promise<string>
}
