/**
 * @param {string} snippet
 * @returns {string}
 */
export function encodeSnippet(snippet) {
  return Buffer.from(snippet, "utf-8").toString("base64")
}

/**
 * @param {string} base64
 * @returns {string}
 */
export function decodeSnippet(base64) {
  return Buffer.from(base64, "base64").toString("utf-8")
}
