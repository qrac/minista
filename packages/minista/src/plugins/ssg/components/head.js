/** @typedef {import('../types').HeadProps} HeadProps */
/** @typedef {import('../types').HeadData} HeadData */
/** @typedef {import('../types').SetHeadData} SetHeadData */

import { createElement, useContext } from "react"
import { HeadContext } from "minista/context"

/**
 * @param {HeadProps} props
 * @returns {null}
 */
export function Head({
  htmlAttributes,
  bodyAttributes,
  title,
  tags,
  children,
}) {
  /** @type {{ setHeadData?: SetHeadData }} */
  const { setHeadData } = useContext(HeadContext)
  if (!setHeadData) return null

  if (htmlAttributes) setHeadData("htmlAttributes", htmlAttributes)
  if (bodyAttributes) setHeadData("bodyAttributes", bodyAttributes)
  if (title) setHeadData("title", title)
  if (tags) setHeadData("tags", tags)
  if (children) setHeadData("tags", children)

  return null
}

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
    children,
  )
}
