/**
 * Create a unique Rollup/Rolldown input name without path separators.
 * Input names are not file paths: bundlers may use them when naming assets.
 * @param {string} sourcePath
 * @param {Set<string>} usedIds
 * @returns {string}
 */
export function createAssetEntryId(sourcePath, usedIds = new Set()) {
  const name = sourcePath
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "asset"
  let id = name
  let index = 2
  while (usedIds.has(id)) id = `${name}${index++}`
  usedIds.add(id)
  return id
}
