type Item = {
  name: string
  url: string
  externalLink?: boolean
}

type ItemGroup = {
  name: string
  items: Item[]
}

export type Props = {
  currentUrl: string
  itemGroups: ItemGroup[]
}

export const initialProps: Props = {
  currentUrl: "/",
  itemGroups: [
    {
      name: "Sidebar",
      items: [
        {
          name: "demo",
          url: "",
        },
      ],
    },
  ],
}
