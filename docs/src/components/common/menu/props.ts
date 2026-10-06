import type {
  Locale,
  Locales,
  NavigationMain,
  NavigationDocs,
} from "../../../../types"

export type Props = {
  url: string
  locale: Locale
  locales: Locales
  navMain: NavigationMain
  navDocsGroups: NavigationDocs["groups"]
}

export const initialProps: Props = {
  url: "/",
  locale: "en",
  locales: {
    en: {
      name: "English",
      path: "/",
    },
    ja: {
      name: "日本語",
      path: "/ja/",
    },
  },
  navMain: {
    name: {
      en: "Menu",
      ja: "メニュー",
    },
    items: [
      {
        id: "demo",
        name: {
          en: "Demo",
          ja: "デモ",
        },
        url: "",
        external: false,
      },
    ],
  },
  navDocsGroups: [
    {
      id: "menu",
      name: {
        en: "Menu",
        ja: "メニュー",
      },
      pager: true,
      items: [
        {
          id: "demo",
          name: {
            en: "Demo",
            ja: "デモ",
          },
          url: "",
        },
      ],
    },
  ],
}
