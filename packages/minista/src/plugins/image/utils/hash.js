import { createHash } from "node:crypto"

/**
 * @param {string|Buffer} input
 * @returns {string}
 */
export function generateHash(input) {
  const hash = createHash("sha256")
  hash.update(input)
  return hash.digest("hex")
}
