import type { ReactNode } from "react"
import { renderToString } from "react-dom/server"

import type {
  StaticRenderer,
  StaticRenderInput,
  StaticRenderResult,
} from "../../core/ports/index.js"

export class ReactRenderToStringRenderer implements StaticRenderer<ReactNode> {
  async render(
    input: StaticRenderInput<ReactNode>,
  ): Promise<StaticRenderResult> {
    return Object.freeze({ html: renderToString(input.tree) })
  }
}
