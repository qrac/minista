// @ts-check

const prefix = "minista:island-import:"

/** Preserve the importing module across snippet generation and JSON handoff.
 * @param {string} source
 * @param {string} importer
 */
export function encodeIslandImport(source, importer) {
  return prefix + Buffer.from(JSON.stringify({ schemaVersion: 1, source, importer })).toString("base64url")
}

/** @param {string} id */
export function decodeIslandImport(id) {
  if (!id.startsWith(prefix)) return undefined
  try {
    const value = JSON.parse(Buffer.from(id.slice(prefix.length), "base64url").toString("utf8"))
    if (value?.schemaVersion === 1 && typeof value.source === "string" &&
      typeof value.importer === "string" && value.source && value.importer) {
      return /** @type {{schemaVersion: 1; source: string; importer: string}} */ (value)
    }
  } catch {}
  throw Object.assign(new Error("Invalid Island import reference."), {
    diagnostic: { code: "MINISTA_ISLAND_IMPORT_INVALID", severity: "error", feature: "feature:island", phase: "bundle", message: "Invalid Island import reference." },
  })
}
