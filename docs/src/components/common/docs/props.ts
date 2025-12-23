export type Props = {
  DOMElement: React.ElementType
  isSidetocTarget: boolean
  children: React.ReactNode
}

export const initialProps: Props = {
  DOMElement: "div",
  isSidetocTarget: false,
  children: null,
}
