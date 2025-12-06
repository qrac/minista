/**
 * @param {React.ReactElement[]} tags
 * @returns {boolean}
 */
export function checkViewport(tags) {
  return tags.some(
    (item) => item?.type === "meta" && item.props?.name === "viewport"
  )
}
