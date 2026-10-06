import type { Environment, Plugin } from "vite"
import type {
  FeatureNode,
  OutputClaim,
} from "../../core/graph/index.js"

export interface MinistaOutputClaimApi {
  readonly feature?: {
    readonly id: string
    readonly apiVersion: 1
    readonly provides: readonly string[]
    readonly requires: readonly string[]
  }
  readonly outputClaims?: (environment?: Environment) =>
    | readonly OutputClaim[]
    | Promise<readonly OutputClaim[]>
}
export interface ViteOutputClaimCollection {
  readonly features: readonly FeatureNode[]
  readonly claims: readonly OutputClaim[]
}
export declare function collectViteOutputClaims(
  plugins: readonly Plugin[],
  environment?: Environment,
): Promise<ViteOutputClaimCollection>
