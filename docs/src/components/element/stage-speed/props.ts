export type Comparison = {
  label: string
  unit: "s" | "ms"
  before: { label: string; value: number }
  after: { label: string; value: number }
}

export type Props = {
  comparisons: Comparison[]
  caption: string
}

export const initialProps: Props = {
  comparisons: [],
  caption: "",
}
