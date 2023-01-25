import path from "node:path"
import picomatch from "picomatch"

import type { ResolvedConfig } from "../config/index.js"
import type { SsgPage } from "../server/ssg.js"

export function transformListDataDelivery({
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
        const pTitle = page.html.match(
          /<title[^<>]*?>\s*\n*(.*?)\s*\n*<\/title>/i
        )
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

export function transformListStrDelivery(
  data: {
    title: string
    path: string
  }[]
) {
  const items = data.map((item) => {
    return `<li class="minista-delivery-item">
  <div class="minista-delivery-item-content">
    <a
      class="minista-delivery-item-content-link"
      href="${item.path}"
    ></a>
    <div class="minista-delivery-item-content-inner">
      <p class="minista-delivery-item-content-name">${item.title}</p>
      <p class="minista-delivery-item-content-slug">${item.path}</p>
    </div>
    <div class="minista-delivery-item-content-background"></div>
  </div>
</li>`
  })
  const itemsStr = items.join("\n")
  return itemsStr
    ? `<ul class="minista-delivery-list">\n` + itemsStr + `\n</ul>`
    : ""
}

export function transformButtonsDataDelivery(config: ResolvedConfig) {
  const { resolvedBase } = config.sub

  return config.main.delivery.archives.map((item) => {
    const outFile = item.outName + "." + item.format
    const fileName = path.join(item.outDir, outFile)
    const title = item.button?.title ? item.button.title : fileName
    const link = path.join(resolvedBase, fileName)
    const color = item.button?.color ? item.button.color : ""
    return { title, path: link, color }
  })
}

export function transformButtonsStrDelivery(
  data: {
    title: string
    path: string
    color: string
  }[]
) {
  const items = data.map((item) => {
    const colorStr = item.color
      ? `\n  style="background-color: ${item.color};"`
      : ""
    return `<a
  class="minista-delivery-button"
  href="${item.path}"${colorStr}
>
  ${item.title}
</a>`
  })
  const itemsStr = items.join("\n")
  return itemsStr
}

export function transformDelivery({
  html,
  ssgPages,
  config,
}: {
  html: string
  ssgPages: SsgPage[]
  config: ResolvedConfig
}) {
  let _html = html

  const listData = transformListDataDelivery({ ssgPages, config })
  const listStr = transformListStrDelivery(listData)

  _html = _html.replace(
    /<div[^<>]*?data-minista-transform-target="delivery-list".*?>\s*\n*<\/div>/gi,
    listStr
  )

  if (config.main.delivery.archives.length > 0) {
    const buttonsData = transformButtonsDataDelivery(config)
    const buttonsStr = transformButtonsStrDelivery(buttonsData)

    _html = _html.replace(
      /<div[^<>]*?data-minista-transform-target="delivery-buttons".*?>\s*\n*<\/div>/gi,
      buttonsStr
    )
  }
  return _html
}
