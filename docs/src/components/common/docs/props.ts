import type { ElementType, ReactNode } from "react"

export type Props = {
  DOMElement: ElementType
  isSidetocTarget: boolean
  hasSearch: boolean
  children: ReactNode
}

export const initialProps: Props = {
  DOMElement: "div",
  isSidetocTarget: false,
  hasSearch: false,
  children: null,
}
