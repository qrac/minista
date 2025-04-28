/** @typedef {import('../types').ImageOptimize} ImageOptimize */
/** @typedef {import('../types').ResolvedImageOptimize} ResolvedImageOptimize */

/**
 * @param {ImageOptimize["breakpoints"]} breakpoints
 * @param {number} width
 * @returns {ResolvedImageOptimize["breakpoints"]}
 */
export function resolveBreakpoints(breakpoints, width) {
  let result = []

  if (Array.isArray(breakpoints)) {
    const mapped = breakpoints
      .filter((item) => typeof item === "number" && item > 0)
      .map((item) => Math.min(item, width))
    return Array.from(new Set(mapped)).sort((a, b) => a - b)
  }

  const { count = 1, minWidth = 320, maxWidth = 3840 } = breakpoints || {}

  const maxW = Math.min(maxWidth, width)
  const minW = Math.min(minWidth, maxW)

  if (count >= 2) result.push(minW)
  if (count >= 3) {
    const steps = count - 2
    const diff = maxW - minW
    for (let i = 1; i <= steps; i++) {
      const num = Math.round(minW + diff / (i + 1))
      result.push(num)
    }
  }
  result.push(maxW)

  return Array.from(new Set(result)).sort((a, b) => a - b)
}
