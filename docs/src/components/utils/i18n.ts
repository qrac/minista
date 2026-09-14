import { Locale, Locales } from "../../../types"

export function localizeName(
  name: string | Partial<Record<Locale, string>>,
  locale: Locale,
) {
  if (typeof name === "string") return name

  return name[locale] ?? ""
}

export function localizePath(url: string, locale: Locale, locales: Locales) {
  let path = url.startsWith("/") ? url : `/${url}`

  for (const item of Object.values(locales)) {
    if (item.path === "/") continue

    const prefix = item.path.replace(/\/$/, "")

    if (path === prefix || path.startsWith(`${prefix}/`)) {
      path = path.slice(prefix.length) || "/"
      break
    }
  }

  const localePath = locales[locale].path

  if (localePath === "/") return path

  const prefix = localePath.replace(/\/$/, "")

  return `${prefix}${path}`
}
