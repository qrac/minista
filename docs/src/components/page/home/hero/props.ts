export type Props = {
  description: string
  license: string
  repositoryUrl: string
  actions: {
    name: string
    url: string
    variant: string
  }[]
}

export const initialProps: Props = {
  description: "",
  license: "MIT",
  repositoryUrl: "",
  actions: [],
}
