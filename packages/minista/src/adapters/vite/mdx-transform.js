// @ts-check

/** @typedef {import("@mdx-js/mdx").CompileOptions} CompileOptions */

/** @param {string} value */
function normalizeExtension(value) {
  return value.startsWith(".") ? value : `.${value}`
}

/**
 * Vite-facing lazy MDX transformer. This module intentionally does not import
 * the MDX compiler so projects without matching modules avoid its startup cost.
 *
 * @param {Readonly<CompileOptions>} options
 */
export function createViteMdxTransformer(options) {
  const mdExtensions = new Set(
    (options.mdExtensions ?? [".md"]).map(normalizeExtension),
  )
  const mdxExtensions = new Set(
    (options.mdxExtensions ?? [".mdx"]).map(normalizeExtension),
  )
  let development = false
  /** @type {Promise<any> | undefined} Compiler is loaded across a dynamic module boundary. */
  let compilerPromise

  return Object.freeze({
    /** @param {boolean} value */
    setDevelopment(value) {
      development = value
    },

    /** @param {string} value @param {string} id */
    async transform(value, id) {
      const [filePath, query = ""] = id.split("?", 2)
      const extension = filePath.slice(filePath.lastIndexOf("."))
      const format = mdExtensions.has(extension)
        ? "md"
        : mdxExtensions.has(extension)
          ? "mdx"
          : undefined
      if (!format) return undefined

      const search = new URLSearchParams(query)
      if (search.has("raw") || search.has("url")) return undefined

      compilerPromise ??= import("./mdx-compiler.js").then(
        ({ createMdxCompiler }) =>
          createMdxCompiler({ ...options, development }),
      )
      const compiler = await compilerPromise
      const compiled = await compiler.process(value, filePath, format)

      return Object.freeze({
        code: String(compiled.value),
        map: compiled.map,
        messages: Object.freeze([...compiled.messages]),
      })
    },
  })
}
