import type { NodeExternalBuildHandoff } from "../filesystem/external-build-handoff.js"
import type { RenderedPage } from "../../features/ssg/index.js"
import type { ViteBuildSession } from "./build-session.js"

export interface ViteBuildDataReaderOptions {
  readonly root: string
  readonly session?: ViteBuildSession
  readonly externalBuildId?: string
  readonly handoff?: NodeExternalBuildHandoff
}

export declare class ViteBuildDataReader {
  constructor(options: ViteBuildDataReaderOptions)
  readRenderedPages(): Promise<readonly RenderedPage[]>
  readIslandSnippets(): Promise<readonly string[]>
}
