import type { ReactNode } from "react"
import type { UserConfig } from "vite"
import type { StaticRenderer } from "../../core/ports/index.js"

export declare function hasPreactAlias(config: UserConfig): boolean

export declare function createViteReactRenderer(
  config: UserConfig,
): Promise<StaticRenderer<ReactNode>>
