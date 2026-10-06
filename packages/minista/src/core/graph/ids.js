// @ts-check

/** @typedef {import("./ids.js").NodeKind} NodeKind */

/** @param {string} value */
function encodeIdentity(value) {
  return encodeURIComponent(value).replaceAll("%2F", "/")
}
/**
 * @template {NodeKind} Kind
 * @param {Kind} kind
 * @param {string} identity
 * @param {string} [variant]
 * @returns {import("./ids.js").NodeId<Kind>}
 */
export function createNodeId(kind, identity, variant) {
  const suffix = variant ? `#${encodeIdentity(variant)}` : ""
  return /** @type {import("./ids.js").NodeId<Kind>} */ (
    `${kind}:${encodeIdentity(identity)}${suffix}`
  )
}
