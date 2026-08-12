import type { RouteNode } from "../../core/graph/index.js"

export interface SsgDiscoveryOptions {
  readonly srcBases: readonly string[]
}

export interface StaticData {
  readonly paths?: Readonly<Record<string, string | number>>
  readonly props?: Readonly<Record<string, unknown>>
}

export type GetStaticData = () => Promise<
  StaticData | readonly StaticData[] | null | undefined
>

export interface PageModule {
  readonly default: unknown
  readonly getStaticData?: GetStaticData
  readonly metadata?: Readonly<Record<string, unknown>>
}

export interface DiscoveredRoute {
  readonly route: RouteNode
  readonly sourceKey: string
}
