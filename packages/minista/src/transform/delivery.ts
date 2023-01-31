import type { HTMLElement as NHTMLElement } from "node-html-parser"
import picomatch from "picomatch"
import { parse as parseHtml } from "node-html-parser"

import type { ResolvedConfig } from "../config/index.js"
import type { SsgPages } from "../transform/ssg.js"
import { flags } from "../config/system.js"
import { getElements, cleanElement } from "../utility/element.js"

const cleanAttributes = ["data-minista-transform-target"]

export function getDeliveryData({
  ssgPages,
  config,
}: {
  ssgPages: SsgPages
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

export function getDeliveryTag(
  deliveryData: {
    title: string
    path: string
  }[],
  hasRelativeFlag?: boolean
) {
  const flag = hasRelativeFlag ? `\n      ${flags.relative}` : ""
  const tags = deliveryData.map((item) => {
    return `<li class="minista-delivery-item">
  <div class="minista-delivery-item-content">
    <a
      class="minista-delivery-item-content-link"
      href="${item.path}"${flag}
    ></a>
    <div class="minista-delivery-item-content-inner">
      <p class="minista-delivery-item-content-name">${item.title}</p>
      <p class="minista-delivery-item-content-slug">${item.path}</p>
    </div>
    <div class="minista-delivery-item-content-background"></div>
  </div>
</li>`
  })
  const tagsStr = tags.join("\n")
  return tagsStr
    ? `<ul class="minista-delivery-list">\n` + tagsStr + `\n</ul>`
    : ""
}

export function transformDeliveries({
  parsedData,
  ssgPages,
  config,
}: {
  parsedData: NHTMLElement | NHTMLElement[]
  ssgPages: SsgPages
  config: ResolvedConfig
}) {
  const { base } = config.main

  const targetAttr = `[data-minista-transform-target="delivery"]`
  const targetEls = getElements(parsedData, targetAttr)

  if (!targetEls.length || !ssgPages.length) {
    return
  }
  const deliveryData = getDeliveryData({ ssgPages, config })
  const hasRelativeFlag = base === "" || base === "./"
  const insertTag = getDeliveryTag(deliveryData, hasRelativeFlag)
  const insertEl = parseHtml(insertTag)

  targetEls.map((el) => {
    el.parentNode.exchangeChild(el, insertEl)
    cleanElement(el, cleanAttributes)
    return
  })
}
