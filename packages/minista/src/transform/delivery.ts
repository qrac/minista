import type { HTMLElement as NHTMLElement } from "node-html-parser"
import picomatch from "picomatch"
import { parse as parseHtml } from "node-html-parser"

import type { ResolvedConfig } from "../config/index.js"
import type { SsgPages } from "../transform/ssg.js"
import { flags } from "../config/system.js"
import { getElements, cleanElement } from "../utility/element.js"

type DeliveryItems = {
  group: string
  title: string
  path: string
  draft: boolean
}[]

type DeliveryGroups = {
  title: string
  items: {
    title: string
    path: string
    draft: boolean
  }[]
}[]

const cleanAttributes = ["data-minista-transform-target"]

export function getDeliveryItems({
  ssgPages,
  config,
}: {
  ssgPages: SsgPages
  config: ResolvedConfig
}): DeliveryItems {
  const { include, exclude, trimTitle, sortBy } = config.main.delivery

  const filterdPages = ssgPages.filter((page) => {
    return picomatch.isMatch(page.path, include, {
      ignore: exclude,
    })
  })
  if (!filterdPages.length) {
    return []
  }
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
        group: page.group,
        title,
        path: page.path,
        draft: page.draft,
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

export function getDeliveryGroups(items: DeliveryItems): DeliveryGroups {
  if (!items.length) {
    return []
  }
  const groupTitles = [...new Set(items.map((item) => item.group))].sort()

  let groups: DeliveryGroups = groupTitles.map((item) => {
    return { title: item, items: [] }
  })
  items.map((item) => {
    const itemObj = { title: item.title, path: item.path, draft: item.draft }
    const target = groups.find((group) => group.title === item.group)
    target && target.items.push(itemObj)
    return
  })
  return groups
}

export function getDeliveryTag({
  title,
  items,
  hasRelativeFlag,
}: {
  title?: DeliveryGroups[0]["title"]
  items: DeliveryGroups[0]["items"]
  hasRelativeFlag?: boolean
}) {
  if (!items.length) {
    return ""
  }
  const flag = hasRelativeFlag ? `\n      ${flags.relative}` : ""
  const titleStr = title
    ? `\n<h2 class="minista-delivery-nav-title">${title}</h2>\n`
    : ""
  const listStr = items
    .map((item) => {
      const draftStr = item.draft ? " is-draft" : ""
      return `<li class="minista-delivery-item${draftStr}">
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
    .join("\n")
  return `<nav class="minista-delivery-nav">${titleStr}
<ul class="minista-delivery-list">
${listStr}
</ul>
</nav>`
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
  const items = getDeliveryItems({ ssgPages, config })
  const groups = getDeliveryGroups(items)

  const insertTags = groups.map((group) => {
    return getDeliveryTag({
      title: group.title,
      items: group.items,
      hasRelativeFlag: base === "" || base === "./",
    })
  })
  const insertTag = insertTags.join("\n")
  const insertEl = parseHtml(insertTag)

  targetEls.map((el) => {
    el.parentNode.exchangeChild(el, insertEl)
    cleanElement(el, cleanAttributes)
    return
  })
}
