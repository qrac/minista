export type Props = {
  id: string
  buttonNode: React.ReactElement<{
    style?: React.CSSProperties
    popoverTarget?: string
  }>
  children: React.ReactNode
}

export const initialProps: Props = {
  id: "pulldown",
  buttonNode: null,
  children: null,
}
