import type { ReactNode } from "react"
import type { StaticRenderer, StaticRenderInput, StaticRenderResult } from "../../core/ports/index.js"
export declare class ReactRenderToStringRenderer implements StaticRenderer<ReactNode> {
  render(input: StaticRenderInput<ReactNode>): Promise<StaticRenderResult>
}
