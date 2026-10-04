// @ts-check

/** @typedef {{fileName: string, imports: readonly string[], viteMetadata?: {importedCss?: ReadonlySet<string>}}} CssChunk */

/**
 * Vite attaches CSS to the chunk that owns it, which may be a shared dependency
 * rather than the entry. Visit static imports first to retain cascade order.
 * Dynamic imports keep Vite's async CSS loading behavior.
 * @param {CssChunk | undefined} entry
 * @param {Readonly<Record<string, CssChunk>>} chunks
 * @returns {string[]}
 */
export function getViteChunkCss(entry, chunks) {
  const visited = new Set()
  const cssFiles = new Set()

  /** @param {CssChunk} chunk */
  function visit(chunk) {
    if (visited.has(chunk.fileName)) return
    visited.add(chunk.fileName)
    for (const fileName of chunk.imports) {
      const dependency = chunks[fileName]
      if (dependency) visit(dependency)
    }
    for (const fileName of chunk.viteMetadata?.importedCss ?? []) {
      cssFiles.add(fileName)
    }
  }

  if (entry) visit(entry)
  return [...cssFiles]
}
