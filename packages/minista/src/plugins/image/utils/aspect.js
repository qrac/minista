/**
 * @param {string} aspect
 * @returns {string | undefined}
 */
export function resolveAspect(aspect) {
  const regex = /^\d+\.?\d*:\d+\.?\d*$/
  const isAspect = regex.test(aspect)

  if (!isAspect) return undefined
  return aspect
}
