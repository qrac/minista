/** @typedef {import('../types').SvgProps} SvgProps */

import { createElement } from "react"

/**
 * @param {SvgProps} props
 * @returns {React.ReactElement}
 */
export function Svg({ src, className, title, ...attributes }) {
  return createElement(
    "svg",
    {
      className: className || undefined,
      xmlns: "http://www.w3.org/2000/svg",
      ...attributes,
      "data-minista-svg": "",
      "data-minista-svg-src": src,
    },
    title ? createElement("title", null, title) : null
  )
}
