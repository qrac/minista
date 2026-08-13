export declare const PROJECT_MANIFEST_SCHEMA_VERSION: "1"
export declare class ProjectManifestMigrationError extends Error {
  readonly code: "MINISTA_MANIFEST_MIGRATION_FAILED"
  constructor(message: string)
}
export interface ProjectManifestMigration {
  readonly from: string
  readonly to: string
  migrate(value: Readonly<Record<string, unknown>>): unknown
}
export declare function migrateProjectManifest(
  value: unknown,
  migrations?: readonly ProjectManifestMigration[],
): unknown
