// @ts-check

/**
 * URL spans in an HTML attribute. Preserve descriptors, whitespace and commas
 * inside URLs (notably data URLs) when editing a srcset.
 * @param {string} value
 * @param {boolean} [srcset]
 * @returns {{ start: number, end: number }[]}
 */
export function htmlUrlRanges(value, srcset = false) {
  const ranges = []
  if (!srcset) {
    const start = value.search(/\S/)
    if (start >= 0) ranges.push({ start, end: value.trimEnd().length })
    return ranges
  }
  let cursor = 0
  while (cursor < value.length) {
    while (cursor < value.length && /[\t\n\f\r ,]/.test(value[cursor] ?? "")) cursor++
    const start = cursor
    while (cursor < value.length && !/[\t\n\f\r ]/.test(value[cursor] ?? "")) cursor++
    let end = cursor
    while (value[end - 1] === ",") end--
    if (end > start) ranges.push({ start, end })
    if (end < cursor) continue
    let parentheses = 0
    while (cursor < value.length) {
      const character = value[cursor++]
      if (character === "(") parentheses++
      if (character === ")") parentheses--
      if (character === "," && parentheses === 0) break
    }
  }
  return ranges
}
