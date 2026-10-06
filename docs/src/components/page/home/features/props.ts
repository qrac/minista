type Item = {
  id: string
  tabletColumn: number
  href: string
  title: string
  description: string
}

export type Props = {
  heading: string
  items: Item[]
}

export const initialProps: Props = {
  heading: "",
  items: [],
}
