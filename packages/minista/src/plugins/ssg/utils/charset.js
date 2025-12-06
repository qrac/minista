/**
 * @param {React.ReactElement[]} tags
 * @returns {boolean}
 */
export function checkCharset(tags) {
  return tags.some(
    (item) => item?.type === "meta" && "charSet" in (item.props ?? {})
  )
}
