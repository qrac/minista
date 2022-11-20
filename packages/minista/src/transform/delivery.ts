import picomatch from "picomatch"

import type { ResolvedConfig } from "../config/index.js"
import type { SsgPage } from "../server/ssg.js"

export function transformDelivery({
  ssgPages,
  config,
}: {
  ssgPages: SsgPage[]
  config: ResolvedConfig
}) {
  const { include, exclude, trimTitle, sortBy } = config.main.delivery
  const filterdPages = ssgPages.filter((page) => {
    return picomatch.isMatch(page.path, include, {
      ignore: exclude,
    })
  })
  return filterdPages
    .map((page) => {
      let title: string
      title = page.title ? page.title : ""

      if (!title) {
        const pTitle = page.html.match(/<title[^<>]*?>\n*(.*?)\n*<\/title>/i)
        title = pTitle ? pTitle[1] : ""
      }
      const regTrimTitle = new RegExp(trimTitle)
      title = title ? title.replace(regTrimTitle, "") : ""

      return {
        title,
        path: page.path,
      }
    })
    .sort((a, b) => {
      let itemA: string
      let itemB: string
      itemA = sortBy === "path" ? a.path.toUpperCase() : a.title
      itemB = sortBy === "path" ? b.path.toUpperCase() : b.title

      if (itemA < itemB) {
        return -1
      }
      if (itemA > itemB) {
        return 1
      }
      return 0
    })
}
