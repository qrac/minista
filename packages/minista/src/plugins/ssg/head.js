import { useContext } from "react"
import { HeadContext } from "./context.js"

/** @typedef {import('./types').HeadProps} HeadProps */
/** @typedef {import('./types').SetHeadData} SetHeadData */

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

  if (htmlAttributes) setHeadData("htmlAttributes", htmlAttributes)
  if (bodyAttributes) setHeadData("bodyAttributes", bodyAttributes)
  if (title) setHeadData("title", title)
  if (tags) setHeadData("tags", tags)
  if (children) setHeadData("tags", children)

  return null
}
