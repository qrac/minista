// @ts-check

import { serializeStableJson } from "../serialization/index.js"

/** @param {import("./types.js").ProjectManifest} manifest */
export function serializeProjectManifest(manifest) {
  return serializeStableJson(manifest)
}
