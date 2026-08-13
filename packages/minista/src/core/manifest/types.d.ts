import type { DiagnosticSummary } from "../diagnostics/index.js"
export interface OutputFile {
  readonly logicalId: string
  readonly kind: "chunk" | "asset"
  readonly fileName: string
  readonly url: string
  readonly byteSize: number
  readonly isEntry?: boolean
  readonly isDynamicEntry?: boolean
  readonly imports?: readonly string[]
  readonly dynamicImports?: readonly string[]
}
export interface OutputManifest {
  readonly schemaVersion: "1"
  readonly environment: string
  readonly files: readonly OutputFile[]
}
export interface ProjectManifest {
  readonly schemaVersion: "1"
  readonly generator: {
    readonly name: "minista"
    readonly version: string
  }
  readonly project: {
    readonly id: string
    readonly name: string
    readonly root: "."
  }
  readonly features: readonly {
    readonly id: string
    readonly apiVersion: 1
    readonly provides: readonly string[]
    readonly requires: readonly string[]
  }[]
  readonly routes: readonly {
    readonly id: string
    readonly sourceFile: string
    readonly pattern: string
    readonly params: readonly {
      readonly name: string
      readonly optional: boolean
      readonly rest: boolean
    }[]
  }[]
  readonly pages: readonly {
    readonly id: string
    readonly routeId: string
    readonly url: string
    readonly params: Readonly<Record<string, string>>
    readonly draft: boolean
    readonly output?: {
      readonly fileName: string
      readonly url: string
    }
  }[]
  readonly assets: readonly {
    readonly id: string
    readonly kind: string
    readonly source?: string
    readonly contentHash?: string
    readonly consumers: readonly string[]
    readonly output?: {
      readonly fileName: string
      readonly url: string
    }
  }[]
  readonly artifacts: readonly {
    readonly id: string
    readonly kind: string
    readonly owner: string
    readonly output?: {
      readonly fileName: string
      readonly url: string
    }
    readonly dependencies: readonly string[]
  }[]
  readonly outputs?: readonly OutputFile[]
  readonly diagnosticSummary: DiagnosticSummary
  readonly createdAt: string
}
