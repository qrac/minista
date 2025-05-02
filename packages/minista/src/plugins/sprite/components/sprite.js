/** @typedef {import('../types').SpriteProps} SpriteProps */

import { createElement } from "react"

/**
 * @param {SpriteProps} props
 * @returns {React.ReactElement}
 */
export function Sprite({ src, className, title, symbolId, ...attributes }) {
  return createElement(
    "svg",
    {
      className: className || undefined,
      ...attributes,
    },
    title ? createElement("title", null, title) : null,
    createElement("use", {
      href: null,
      "data-minista-sprite": "",
      "data-minista-sprite-src": src,
      "data-minista-sprite-symbol-id": symbolId,
    })
  )
}
