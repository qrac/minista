export declare class ViteOutputDirectoryUnsafeError extends Error {
  readonly code: "MINISTA_OUTPUT_TRANSACTION_UNSAFE_DIR"
  constructor(outDir: string)
}
export declare class ViteOutputBackupExistsError extends Error {
  readonly code: "MINISTA_OUTPUT_TRANSACTION_BACKUP_EXISTS"
  constructor(backupDir: string)
}
export declare class ViteOutputTransaction {
  constructor(options: {
    readonly root: string
    readonly outDir: string
    readonly buildId?: string
  })
  get outDir(): string
  get backupDir(): string
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
}
