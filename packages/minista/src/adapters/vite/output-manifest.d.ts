import type { OutputManifest } from "../../core/manifest/index.js"
import type { ViteBuildOutput } from "./app-builder.js"

export declare function createViteOutputManifest(
  output: ViteBuildOutput,
  options: { readonly environment: string; readonly base?: string },
): OutputManifest
export declare function reconcileViteOutputManifest(
  manifest: OutputManifest,
  options: { readonly outDir: string; readonly base?: string },
): Promise<OutputManifest>
