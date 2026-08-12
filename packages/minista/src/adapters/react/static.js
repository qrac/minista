// @ts-check

import { text } from "node:stream/consumers"
import { prerenderToNodeStream } from "react-dom/static"

/** @typedef {import("react").ReactNode} ReactNode */
/** @typedef {import("../../core/ports/index.js").StaticRenderInput<ReactNode>} ReactRenderInput */
/** @typedef {import("../../core/ports/index.js").StaticRenderResult} StaticRenderResult */

export class ReactStaticRenderer {
  /**
   * @param {ReactRenderInput} input
   * @returns {Promise<StaticRenderResult>}
   */
  async render(input) {
    const { prelude } = await prerenderToNodeStream(input.tree)
    return Object.freeze({ html: await text(prelude) })
  }
}
