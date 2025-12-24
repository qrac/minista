type Item = {
  name: string
  url: string
  externalLink?: boolean
}

type ItemGroup = {
  name: string
  items: Item[]
  isMain?: boolean
}

export type Props = {
  currentUrl: string
  itemGroups: ItemGroup[]
}

export const initialProps: Props = {
  currentUrl: "/",
  itemGroups: [
    {
      name: "Menu",
      items: [
        {
          name: "demo",
          url: "",
        },
      ],
    },
  ],
}
