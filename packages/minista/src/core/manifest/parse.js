// @ts-check

/** @param {unknown} value */
function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

export class ProjectManifestInvalidError extends Error {
  code = "MINISTA_MANIFEST_INVALID"

  /** @param {string} message */
  constructor(message) {
    super(message)
    this.name = "ProjectManifestInvalidError"
  }
}

export class ProjectManifestVersionUnsupportedError extends Error {
  code = "MINISTA_MANIFEST_VERSION_UNSUPPORTED"

  /** @param {unknown} version */
  constructor(version) {
    super(`Project manifest schema version ${String(version)} is unsupported.`)
    this.name = "ProjectManifestVersionUnsupportedError"
  }
}

/**
 * filesystemやJSON parserに依存せず、公開schemaの読込境界を検証する。
 *
 * @param {unknown} value
 * @returns {import("./types.js").ProjectManifest}
 */
export function parseProjectManifest(value) {
  if (!isRecord(value)) {
    throw new ProjectManifestInvalidError(
      "Project manifest must be a JSON object.",
    )
  }
  const manifest = /** @type {Record<string, unknown>} */ (value)
  if (typeof manifest.schemaVersion !== "string") {
    throw new ProjectManifestInvalidError(
      "Project manifest requires a schemaVersion.",
    )
  }
  if (manifest.schemaVersion !== "1") {
    throw new ProjectManifestVersionUnsupportedError(manifest.schemaVersion)
  }
  if (!isRecord(manifest.generator) || !isRecord(manifest.project)) {
    throw new ProjectManifestInvalidError(
      "Project manifest requires generator and project objects.",
    )
  }
  const generator = /** @type {Record<string, unknown>} */ (manifest.generator)
  const project = /** @type {Record<string, unknown>} */ (manifest.project)
  if (
    generator.name !== "minista" ||
    typeof generator.version !== "string" ||
    typeof project.id !== "string" ||
    typeof project.name !== "string" ||
    project.root !== "."
  ) {
    throw new ProjectManifestInvalidError(
      "Project manifest generator or project identity is invalid.",
    )
  }
  for (const key of ["features", "routes", "pages", "assets", "artifacts"]) {
    if (!Array.isArray(manifest[key])) {
      throw new ProjectManifestInvalidError(
        `Project manifest field ${key} must be an array.`,
      )
    }
  }
  const routes = /** @type {unknown[]} */ (manifest.routes)
  const pages = /** @type {unknown[]} */ (manifest.pages)
  if (routes.some((route) => {
    if (!isRecord(route)) return true
    const item = /** @type {Record<string, unknown>} */ (route)
    return typeof item.id !== "string" ||
      typeof item.pattern !== "string" ||
      typeof item.sourceFile !== "string"
  })) {
    throw new ProjectManifestInvalidError(
      "Project manifest contains an invalid route.",
    )
  }
  if (pages.some((page) => {
    if (!isRecord(page)) return true
    const item = /** @type {Record<string, unknown>} */ (page)
    return typeof item.id !== "string" ||
      typeof item.routeId !== "string" ||
      typeof item.url !== "string"
  })) {
    throw new ProjectManifestInvalidError(
      "Project manifest contains an invalid page.",
    )
  }
  if (
    !isRecord(manifest.diagnosticSummary) ||
    typeof manifest.createdAt !== "string"
  ) {
    throw new ProjectManifestInvalidError(
      "Project manifest requires diagnosticSummary and createdAt.",
    )
  }
  return /** @type {import("./types.js").ProjectManifest} */ (value)
}
