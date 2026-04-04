/**
 * @template T
 * @param {T} obj
 * @returns {Partial<T>}
 */
export function cleanObj(obj) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    // @ts-ignore
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanObj(v)]),
    )
  }
  return obj
}

/**
 * @template T
 * @template U
 * @param {T} obj1
 * @param {U} obj2
 * @returns {T & U}
 */
export function mergeObj(obj1, obj2) {
  /** @type {any} */
  let result = { ...obj1 }

  for (const key in obj2) {
    if (
      Object.prototype.hasOwnProperty.call(obj2, key) &&
      typeof obj2[key] === "object" &&
      obj2[key] !== null &&
      !Array.isArray(obj2[key])
    ) {
      // @ts-ignore
      result[key] = mergeObj(obj1[key] ?? {}, obj2[key])
    } else {
      result[key] = obj2[key]
    }
  }
  return result
}
