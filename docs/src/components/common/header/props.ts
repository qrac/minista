import type {
  Locale,
  Locales,
  NavigationMain,
  NavigationArchives,
} from "../../../../types"

export type Props = {
  url: string
  layout: string
  locale: Locale
  locales: Locales
  currentVersion: string
  archiveItems: NavigationArchives
  mainItems: NavigationMain["items"]
}

export const initialProps: Props = {
  url: "/",
  layout: "",
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
  currentVersion: "0.0.0",
  archiveItems: [{ id: "v0", name: "v0.0.0", url: "/", external: true }],
  mainItems: [
    {
      id: "home",
      name: { en: "Home", ja: "ホーム" },
      url: "/",
      external: false,
    },
  ],
}
