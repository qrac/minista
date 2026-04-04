import { createElement } from "react"

/**
 * @param {string | undefined} title
 * @param {boolean} hasCharset
 * @param {boolean} hasViewport
 * @returns {React.ReactElement[]}
 */
export function getDefaultHeadTags(title, hasCharset, hasViewport) {
  /** @type {React.ReactElement[]} */
  const tags = []

  if (!hasCharset) {
    tags.push(createElement("meta", { charSet: "UTF-8" }))
  }
  if (!hasViewport) {
    tags.push(
      createElement("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0",
      }),
    )
  }
  if (title) {
    tags.push(createElement("title", null, title))
  }
  return tags
}

/**
 * @param {React.ReactElement[]} tags
 * @returns {React.ReactElement[]}
 */
export function filterHeadTags(tags) {
  const map = new Map()
  let autoKey = 0

  for (const item of tags) {
    const key = item?.key != null ? item.key : `__auto_${autoKey++}`
    map.set(key, item)
  }
  return Array.from(map.values())
}

/**
 * @param {React.ReactElement} tag
 * @returns {string}
 */
export function headTagToStr(tag) {
  const selfClosingTags = new Set(["link", "meta"])
  /** @type {{ [key: string]: string }} */
  const attrNameMap = { charSet: "charset" }

  const tagName = typeof tag?.type === "string" ? tag.type : ""
  if (!tagName) return ""

  const attrs = Object.entries(tag.props ?? {})
    .filter(([key]) => key !== "children" && key !== "dangerouslySetInnerHTML")
    .map(([key, value]) => {
      const htmlKey = attrNameMap[key] || key
      return `${htmlKey}="${value}"`
    })
    .join(" ")

  if (selfClosingTags.has(tagName)) {
    return `<${tagName}${attrs ? " " + attrs : ""} />`
  }
  const innerHTML = tag.props?.dangerouslySetInnerHTML?.__html
  const children =
    innerHTML ??
    (typeof tag.props.children === "string" ||
    typeof tag.props.children === "number"
      ? tag.props.children
      : "")

  return `<${tagName}${attrs ? " " + attrs : ""}>${children}</${tagName}>`
}

/**
 * @param {React.ReactElement[]} tags
 * @returns {string}
 */
export function headTagsToStr(tags) {
  return tags.map(headTagToStr).join("")
}
