/**
 * @param {React.ReactElement[]} tags
 * @returns {boolean}
 */
export function checkCharsetTag(tags) {
  return tags.some(
    (item) => item.type === "meta" && "charSet" in (item.props ?? {})
  )
}

/**
 * @param {React.ReactElement[]} tags
 * @returns {boolean}
 */
export function checkViewportTag(tags) {
  return tags.some(
    (item) => item.type === "meta" && item.props?.name === "viewport"
  )
}

/**
 * @param {string | undefined} title
 * @param {boolean} hasCharset
 * @param {boolean} hasViewport
 * @returns {React.ReactElement[]}
 */
export function getDefaultHeadTags(title, hasCharset, hasViewport) {
  return [
    !hasCharset && {
      type: "meta",
      key: null,
      props: {
        charSet: "UTF-8",
      },
    },
    !hasViewport && {
      type: "meta",
      key: null,
      props: {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0",
      },
    },
    title && {
      type: "title",
      key: null,
      props: {
        children: title,
      },
    },
  ].filter(Boolean)
}

/**
 * @param {React.ReactElement[]} tags
 * @returns {React.ReactElement[]}
 */
export function filterHeadTags(tags) {
  const map = new Map()
  let autoKey = 0

  for (const item of tags) {
    const key = item.key != null ? item.key : `__auto_${autoKey++}`
    map.set(key, item)
  }
  return Array.from(map.values())
}

/**
 * @param {React.ReactElement} tag
 * @returns {string}
 */
export function transformHeadTag(tag) {
  const selfClosingTags = new Set(["link", "meta"])
  const attrNameMap = { charSet: "charset" }

  const tagName = typeof tag.type === "string" ? tag.type : ""
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
export function transformHeadTags(tags) {
  return tags.map(transformHeadTag).join("")
}
