// @ts-check

import { renderToString } from "react-dom/server"

/** @typedef {import("react").ReactNode} ReactNode */
/** @typedef {import("../../core/ports/index.js").StaticRenderInput<ReactNode>} ReactRenderInput */
/** @typedef {import("../../core/ports/index.js").StaticRenderResult} StaticRenderResult */

export class ReactRenderToStringRenderer {
  /**
   * @param {ReactRenderInput} input
   * @returns {Promise<StaticRenderResult>}
   */
  async render(input) {
    return Object.freeze({ html: renderToString(input.tree) })
  }
}
