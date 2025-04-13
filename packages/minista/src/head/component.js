import { useContext } from "react"
import { HeadContext } from "./context.js"

/** @typedef {import('./types').HeadData} HeadData */

/**
 * @param {HeadData & {
 *   children?: React.ReactNode
 * }} props
 * @returns {null}
 */
export function Head({
  htmlAttributes,
  bodyAttributes,
  title,
  tags,
  children,
}) {
  const { setHeadData } = useContext(HeadContext)

  if (htmlAttributes) setHeadData("htmlAttributes", htmlAttributes)
  if (bodyAttributes) setHeadData("bodyAttributes", bodyAttributes)
  if (title) setHeadData("title", title)
  if (tags) setHeadData("tags", tags)
  if (children) setHeadData("tags", children)

  return null
}
