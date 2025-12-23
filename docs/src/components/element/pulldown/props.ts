import type { ReactElement, ReactNode, CSSProperties } from "react"

export type Props = {
  id: string
  buttonNode: ReactElement<{
    style?: CSSProperties
    popoverTarget?: string
  }>
  radius: string
  children: ReactNode
}

export const initialProps: Props = {
  id: "pulldown",
  buttonNode: null,
  radius: "",
  children: null,
}
