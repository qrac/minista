/** @typedef {import('../types').CommentProps} CommentProps */

import { createElement } from "react"

/**
 * @param {CommentProps} props
 * @returns {React.ReactElement}
 */
export function Comment({ text, children }) {
  const content = text || children
  return createElement("div", { "data-minista-comment": "" }, content)
}
