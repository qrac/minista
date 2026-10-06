import type { DiagnosticCollector } from "../diagnostics/index.js"
import type { MinistaFeature } from "./types.js"
export declare function scheduleFeatures(features: readonly MinistaFeature[], diagnostics: DiagnosticCollector): readonly MinistaFeature[]
