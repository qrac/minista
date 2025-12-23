import type { ElementType } from "react"

export type Props = {
  DOMElement: ElementType
  text: string
  color: "bg-1" | "bg-2"
  align: "left" | "center" | "right"
  fixPosition: boolean
  fixTop: boolean
}

export const initialProps: Props = {
  DOMElement: "h2",
  text: "Section Title",
  color: "bg-1",
  align: "left",
  fixPosition: false,
  fixTop: false,
}
