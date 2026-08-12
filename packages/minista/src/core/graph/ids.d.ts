export type NodeKind = "project" | "feature" | "route" | "page" | "asset" | "island" | "image" | "artifact"
export type NodeId<Kind extends NodeKind> = `${Kind}:${string}`
export type ProjectId = NodeId<"project">
export type FeatureId = NodeId<"feature">
export type RouteId = NodeId<"route">
export type PageId = NodeId<"page">
export type AssetId = NodeId<"asset">
export type IslandId = NodeId<"island">
export type ImageId = NodeId<"image">
export type ArtifactId = NodeId<"artifact">
export declare function createNodeId<Kind extends NodeKind>(kind: Kind, identity: string, variant?: string): NodeId<Kind>
