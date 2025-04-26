/**
 * @param {number} base
 * @param {number} other
 * @returns {number}
 */
export function getRatio(base, other) {
  if (typeof base !== "number" || typeof other !== "number" || other === 0) {
    return 0
  }
  return Math.round((base / other) * 10000) / 10000
}
