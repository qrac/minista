import { type CommandName, type ModuleEvaluator } from "../../core/index.js"
export interface AnalyzeProjectInput {
  readonly command: Extract<CommandName, "check" | "inspect" | "explain">
  readonly projectName: string
  readonly sourceFiles: readonly string[]
  readonly srcBases: readonly string[]
  readonly target?: string
  readonly evaluator: ModuleEvaluator
}
export declare function analyzeProject(input: AnalyzeProjectInput): Promise<import("../../core/index.js").CommandResult<import("../../core/index.js").Explanation> | import("../../core/index.js").CommandResult<import("../../core/index.js").ProjectInspection>>
