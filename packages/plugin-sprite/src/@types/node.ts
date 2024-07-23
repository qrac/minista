import type { Config as PkgSvgoConfig } from "svgo"
import type { Config as PkgSvgSpriteConfig } from "svg-sprite"

export * from "../node/index.js"

export type SvgSpriteConfig = PkgSvgSpriteConfig & {
  shape?: {
    transform?: {
      svgo?: PkgSvgoConfig
    }
  }
}
