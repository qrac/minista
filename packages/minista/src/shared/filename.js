/**
 * @param {string} url
 * @returns {string}
 */
export function getHtmlFileName(url) {
  const normalized = url.endsWith("/") ? `${url}index.html` : `${url}.html`
  return normalized.replace(/^\//, "")
}
