export function transformAttrs(
  attrs: React.HTMLAttributes<HTMLHtmlElement | HTMLBodyElement>
): string {
  const attrsArray = Object.entries(attrs)

  if (!attrsArray.length) {
    return ""
  }
  return attrsArray.map(([key, value]) => `${key}="${value}"`).join(" ")
}

export function checkTagsCharset(tags: React.ReactElement[]): boolean {
  if (!tags.length) {
    return false
  }
  let hasCharset = false

  tags.map((item) => {
    if (item.type === "meta" && "charset" in item.props) {
      hasCharset = true
    }
  })
  return hasCharset
}

export function checkTagsViewport(tags: React.ReactElement[]): boolean {
  if (!tags.length) {
    return false
  }
  let hasViewport = false

  tags.map((item) => {
    if (item.type === "meta" && item.props?.name === "viewport") {
      hasViewport = true
    }
  })
  return hasViewport
}

export function filterKeyTags(
  tags: React.ReactElement[]
): React.ReactElement[] {
  if (!tags.length) {
    return []
  }
  let count = 0
  let uniqueTags: { [key: string]: React.ReactElement } = {}

  tags.map((item) => {
    if (item.key) {
      uniqueTags[item.key] = item
    } else {
      count += 1
      uniqueTags[count] = item
    }
  })
  return Object.values(uniqueTags)
}

export function transformTag(tag: React.ReactElement): string {
  const selfClosingTags = ["meta", "link"]

  const attr = Object.entries(tag.props)
    .filter(([key]) => key !== "children" && key !== "dangerouslySetInnerHTML")
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ")

  if (selfClosingTags.includes(tag.type.toString())) {
    return `<${tag.type}${attr && " " + attr} />`
  }
  const startTag = `<${tag.type}${attr && " " + attr}>`

  const innerHTML = tag.props.dangerouslySetInnerHTML
    ? tag.props.dangerouslySetInnerHTML.__html
    : ""
  const children = innerHTML ? innerHTML : tag.props.children
  const endTag = `</${tag.type}>`

  return `${startTag}${children ? children : ""}${endTag}`
}

export function transformTags(tags: React.ReactElement[]): string {
  if (!tags.length) {
    return ""
  }
  return tags.map((tag) => transformTag(tag)).join("")
}
