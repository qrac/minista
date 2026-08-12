import { type RouteParam } from "../../core/graph/index.js"
import type { DiscoveredRoute, SsgDiscoveryOptions } from "./types.js"
export declare function parseRouteParams(sourceFile: string): readonly RouteParam[]
export declare function sourceFileToRoutePattern(sourceFile: string, options: SsgDiscoveryOptions): string
export declare function discoverRoute(sourceFile: string, options: SsgDiscoveryOptions): DiscoveredRoute
export declare function discoverRoutes(sourceFiles: readonly string[], options: SsgDiscoveryOptions): readonly DiscoveredRoute[]
