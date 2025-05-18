/**
 * @param {string[]} importLines
 * @param {string[]} jsxLines
 * @returns {string}
 */
export function getSnippet(importLines, jsxLines) {
  const prefix = importLines.length > 0 ? [...importLines, ""] : []
  return [
    ...prefix,
    "export default function () {",
    "  return (",
    ...jsxLines.map((line) => "    " + line.trim()),
    "  )",
    "}",
  ].join("\n")
}

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
