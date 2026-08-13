// @ts-check

import {
  ProjectManifestInvalidError,
  ProjectManifestVersionUnsupportedError,
} from "./parse.js"

export const PROJECT_MANIFEST_SCHEMA_VERSION = "1"

export class ProjectManifestMigrationError extends Error {
  code = "MINISTA_MANIFEST_MIGRATION_FAILED"

  /** @param {string} message */
  constructor(message) {
    super(message)
    this.name = "ProjectManifestMigrationError"
  }
}

/**
 * Apply explicit, one-version-at-a-time migrations before schema validation.
 * v1 is the first published schema, so the built-in registry is currently empty.
 *
 * @param {unknown} value
 * @param {readonly import("./migrate.js").ProjectManifestMigration[]} [migrations]
 * @returns {unknown}
 */
export function migrateProjectManifest(value, migrations = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProjectManifestInvalidError(
      "Project manifest must be a JSON object.",
    )
  }
  let current = /** @type {Record<string, unknown>} */ (value)
  if (typeof current.schemaVersion !== "string") {
    throw new ProjectManifestInvalidError(
      "Project manifest requires a schemaVersion.",
    )
  }
  const visited = new Set()
  while (current.schemaVersion !== PROJECT_MANIFEST_SCHEMA_VERSION) {
    const version = /** @type {string} */ (current.schemaVersion)
    if (visited.has(version)) {
      throw new ProjectManifestMigrationError(
        `Project manifest migration contains a cycle at version ${version}.`,
      )
    }
    visited.add(version)
    /** @type {import("./migrate.js").ProjectManifestMigration[]} */
    const candidates = migrations.filter(({ from }) => from === version)
    if (candidates.length === 0) {
      throw new ProjectManifestVersionUnsupportedError(version)
    }
    if (candidates.length > 1) {
      throw new ProjectManifestMigrationError(
        `Project manifest has multiple migrations from version ${version}.`,
      )
    }
    const migration = /** @type {import("./migrate.js").ProjectManifestMigration} */ (
      candidates[0]
    )
    const migrated = migration.migrate(current)
    if (!migrated || typeof migrated !== "object" || Array.isArray(migrated)) {
      throw new ProjectManifestMigrationError(
        `Project manifest migration from version ${version} returned an invalid value.`,
      )
    }
    current = /** @type {Record<string, unknown>} */ (migrated)
    if (current.schemaVersion !== migration.to) {
      throw new ProjectManifestMigrationError(
        `Project manifest migration from version ${version} did not produce version ${migration.to}.`,
      )
    }
  }
  return current
}
