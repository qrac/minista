import type { Locale, Locales, NavigationDocs } from "../../../../types"

export type Props = {
  url: string
  locale: Locale
  locales: Locales
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
  navDocsGroups: [
    {
      id: "sidebar",
      name: {
        en: "Sidebar",
        ja: "サイドバー",
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
