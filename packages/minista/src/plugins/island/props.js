// @ts-check

/**
 * Wire values are tagged arrays, so user object keys never collide with tags.
 * React/Preact element handling is injected by the renderer, outside Core.
 * @typedef {{isElement: (value: any) => boolean, fragment: any, createElement: (...args: any[]) => any}} ElementAdapter
 */

/** @param {string} path @param {string} reason @param {string} [code] */
function propsError(path, reason, code = "MINISTA_ISLAND_PROPS_UNSUPPORTED") {
  const message = `Island ${path}: ${reason}`
  return Object.assign(new Error(message), {
    diagnostic: { code, severity: "error", message, feature: "feature:island", phase: "render" },
  })
}

/** @param {unknown} props @param {readonly any[]} components @param {ElementAdapter} adapter */
export function serializeIslandProps(props, components, adapter) {
  const ancestors = new Set()
  /** @param {any} value @param {string} path @returns {any} */
  function encode(value, path) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value
    if (typeof value === "number" && Number.isFinite(value)) {
      return Object.is(value, -0) ? ["negative-zero"] : value
    }
    if (value === undefined) return ["undefined"]
    if (typeof value !== "object") throw propsError(path, `unsupported ${typeof value} value.`)
    if (ancestors.has(value)) throw propsError(path, "circular reference.")
    ancestors.add(value)
    try {
      if (adapter.isElement(value)) {
        let type
        if (value.type === adapter.fragment) type = ["fragment"]
        else if (typeof value.type === "string") type = ["tag", value.type]
        else {
          const index = components.indexOf(value.type)
          if (index < 0) throw propsError(path, "JSX component must be statically imported and used in this Island's JSX.")
          type = ["component", index]
        }
        return ["element", type, value.key ?? null, encode(value.props, `${path}.props`)]
      }
      if (Array.isArray(value)) {
        return ["array", Array.from({ length: value.length }, (_, index) =>
          index in value ? encode(value[index], `${path}[${index}]`) : ["hole"])]
      }
      const prototype = Object.getPrototypeOf(value)
      if (prototype !== Object.prototype && prototype !== null) {
        throw propsError(path, "only plain objects and arrays are supported.")
      }
      if (Object.getOwnPropertySymbols(value).length) throw propsError(path, "symbol keys are unsupported.")
      return [prototype === null ? "null-object" : "object", Object.keys(value).map((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key)
        if (!descriptor || !("value" in descriptor)) throw propsError(`${path}.${key}`, "accessors are unsupported.")
        return [key, encode(descriptor.value, `${path}.${key}`)]
      })]
    } finally {
      ancestors.delete(value)
    }
  }
  return JSON.stringify({ schemaVersion: 1, props: encode(props, "props") })
}

/** @param {string} source @param {readonly any[]} components @param {ElementAdapter} adapter @returns {any} */
export function deserializeIslandProps(source, components, adapter) {
  const invalid = () => propsError("props", "invalid serialized payload.", "MINISTA_ISLAND_PROPS_INVALID")
  /** @param {any} value @returns {any} */
  function decode(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))) return value
    if (!Array.isArray(value)) throw invalid()
    const [tag, data] = value
    if (tag === "undefined" && value.length === 1) return undefined
    if (tag === "negative-zero" && value.length === 1) return -0
    if (tag === "array" && value.length === 2 && Array.isArray(data)) {
      const result = new Array(data.length)
      data.forEach((entry, index) => {
        if (Array.isArray(entry) && entry.length === 1 && entry[0] === "hole") return
        result[index] = decode(entry)
      })
      return result
    }
    if ((tag === "object" || tag === "null-object") && value.length === 2 && Array.isArray(data)) {
      const result = tag === "null-object" ? Object.create(null) : {}
      for (const entry of data) {
        if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string" ||
          Object.hasOwn(result, entry[0])) throw invalid()
        Object.defineProperty(result, entry[0], { value: decode(entry[1]), enumerable: true, writable: true, configurable: true })
      }
      return result
    }
    if (tag === "element" && value.length === 4 && Array.isArray(data)) {
      let type
      if (data[0] === "fragment" && data.length === 1) type = adapter.fragment
      else if (data[0] === "tag" && data.length === 2 && typeof data[1] === "string") type = data[1]
      else if (data[0] === "component" && data.length === 2 && Number.isInteger(data[1]) && data[1] >= 0) type = components[data[1]]
      if (!type || (value[2] !== null && typeof value[2] !== "string" && typeof value[2] !== "number")) throw invalid()
      const props = decode(value[3])
      if (!props || typeof props !== "object" || Array.isArray(props)) throw invalid()
      return adapter.createElement(type, { ...props, ...(value[2] === null ? {} : { key: value[2] }) })
    }
    throw invalid()
  }
  try {
    const payload = JSON.parse(source)
    if (payload?.schemaVersion !== 1) throw invalid()
    const props = decode(payload.props)
    if (!props || typeof props !== "object" || Array.isArray(props)) throw invalid()
    return props
  } catch (cause) {
    if (cause instanceof Error && "diagnostic" in cause) throw cause
    throw invalid()
  }
}
