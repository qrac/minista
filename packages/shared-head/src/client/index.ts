import { useContext } from "react"

import type { HeadData, SetHeadData } from "../@types/shared.js"
import { HeadContext } from "../shared/index.js"

export function Head({
  htmlAttributes,
  bodyAttributes,
  title,
  tags,
  children,
}: HeadData & { children?: React.ReactNode }) {
  const { setHeadData } = useContext(HeadContext) as {
    setHeadData: SetHeadData
  }
  htmlAttributes && setHeadData("htmlAttributes", htmlAttributes)
  bodyAttributes && setHeadData("bodyAttributes", bodyAttributes)
  title && setHeadData("title", title)
  tags && setHeadData("tags", tags)
  children && setHeadData("tags", children)
  return null
}
