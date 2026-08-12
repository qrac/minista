import { text } from "node:stream/consumers"
import type { ReactNode } from "react"
import { prerenderToNodeStream } from "react-dom/static"

import type {
  StaticRenderer,
  StaticRenderInput,
  StaticRenderResult,
} from "../../core/ports/index.js"

export class ReactStaticRenderer implements StaticRenderer<ReactNode> {
  async render(
    input: StaticRenderInput<ReactNode>,
  ): Promise<StaticRenderResult> {
    const { prelude } = await prerenderToNodeStream(input.tree)
    return Object.freeze({ html: await text(prelude) })
  }
}
