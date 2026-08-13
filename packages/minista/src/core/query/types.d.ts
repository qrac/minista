import type { Diagnostic } from "../diagnostics/index.js"
export type CommandName = "check" | "inspect" | "explain" | "build"
export interface CommandResult<Data> {
  readonly schemaVersion: "1"
  readonly command: CommandName
  readonly ok: boolean
  readonly data: Data
  readonly diagnostics: readonly Diagnostic[]
}
export interface ProjectInspection {
  readonly schemaVersion: "1"
  readonly project: {
    readonly id: string
    readonly name: string
  }
  readonly counts: {
    readonly features: number
    readonly routes: number
    readonly pages: number
    readonly assets: number
    readonly islands: number
    readonly images: number
    readonly artifacts: number
    readonly outputs: number
  }
  readonly routes: readonly {
    readonly id: string
    readonly pattern: string
    readonly sourceFile: string
    readonly pageIds: readonly string[]
  }[]
}
export interface Explanation {
  readonly target: string
  readonly kind: "route" | "page" | "asset" | "artifact" | "file" | "unknown"
  readonly found: boolean
  readonly summary: string
  readonly relatedNodeIds: readonly string[]
}
