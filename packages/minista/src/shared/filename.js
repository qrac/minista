/**
 * @param {string} url
 * @returns {string}
 */
export function getHtmlFileName(url) {
  const normalized = url.endsWith("/") ? `${url}index.html` : `${url}.html`
  return normalized.replace(/^\//, "")
}

/**
 * @param {string} fileName
 * @returns {string}
 */
export function getHtmlPageUrl(fileName) {
  const normalized = fileName.replace(/^\//, "")
  if (normalized === "index.html") return "/"
  if (normalized.endsWith("/index.html")) {
    return `/${normalized.slice(0, -"index.html".length)}`
  }
  return `/${normalized.replace(/\.html$/, "")}`
}
