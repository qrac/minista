import type { Locale, Locales, NavigationDocs } from "../../../types"
import { localizePath } from "./i18n"

export function formatPager(
  url: string,
  locale: Locale,
  locales: Locales,
  navigation: NavigationDocs,
) {
  const groups = navigation.groups.filter((group) => group.pager !== false)

  const items = groups.flatMap((group) =>
    group.items.map((item) => ({
      name: typeof item.name === "string" ? item.name : item.name[locale],
      url: item.url,
    })),
  )

  const index = items.findIndex((item) => item.url === url)

  if (index === -1) {
    return {
      prevTitle: undefined,
      prevUrl: undefined,
      nextTitle: undefined,
      nextUrl: undefined,
    }
  }

  const prev = items[index - 1]
  const next = items[index + 1]

  return {
    prevTitle: prev?.name,
    prevUrl: prev ? localizePath(prev.url, locale, locales) : undefined,
    nextTitle: next?.name,
    nextUrl: next ? localizePath(next.url, locale, locales) : undefined,
  }
}
