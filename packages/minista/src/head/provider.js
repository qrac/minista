import { createElement } from "react"

import { HeadContext } from "./context.js"

/** @typedef {import('./types').HeadData} HeadData */
/** @typedef {import('./types').SetHeadData} SetHeadData */

/**
 * @param {{ headData: HeadData, children?: React.ReactNode }} props
 * @returns {React.ReactElement}
 */
export function HeadProvider({ headData, children }) {
  /** @type {SetHeadData} */
  const setHeadData = (key, value) => {
    switch (key) {
      case "htmlAttributes":
      case "bodyAttributes":
        headData[key] = {
          ...headData[key],
          ...value,
        }
        break
      case "tags":
        headData[key] = [
          ...(headData[key] ? [headData[key]].flat() : []),
          ...[value].flat(),
        ]
        break
      default:
        headData[key] = value
    }
  }
  return createElement(
    HeadContext.Provider,
    { value: { setHeadData } },
    children
  )
}
