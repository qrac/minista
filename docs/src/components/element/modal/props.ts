import type { ReactNode } from "react"

export type Props = {
  modalId: string
  position: "" | "center" | "right"
  slide: "" | "up" | "left"
  children: ReactNode
}

export const initialProps: Props = {
  modalId: "",
  position: "",
  slide: "",
  children: null,
}
