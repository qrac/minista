// @ts-check

import { decodeIslandImport } from "../island/import-reference.js"

/** Resolve in the client environment, rather than freezing the SSR resolution.
 * @param {import("rolldown").PluginContext} context
 * @param {string} source
 * @param {Parameters<import("rolldown").PluginContext["resolve"]>[2]} options
 */
export async function resolveIslandImport(context, source, options) {
  const reference = decodeIslandImport(source)
  if (!reference) return null
  const resolved = await context.resolve(reference.source, reference.importer, { ...options, skipSelf: true })
  if (resolved) return resolved
  const message = `Cannot resolve Island component import ${JSON.stringify(reference.source)} from ${JSON.stringify(reference.importer)}.`
  throw Object.assign(new Error(message), {
    diagnostic: { code: "MINISTA_ISLAND_COMPONENT_UNRESOLVED", severity: "error", feature: "feature:island", phase: "bundle", message },
  })
}
