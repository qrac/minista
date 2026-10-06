import type { ProjectManifest } from "../../core/manifest/index.js"

export declare class ExternalBuildHandoffInvalidError extends Error {
  readonly code: "MINISTA_EXTERNAL_HANDOFF_INVALID"
  constructor(message: string)
}

export declare class NodeExternalBuildHandoff {
  writeRenderedPages(
    root: string,
    buildId: string,
    pages: readonly { readonly url: string; readonly fileName: string; readonly html: string }[],
  ): Promise<string>
  readRenderedPages(
    root: string,
    buildId: string,
  ): Promise<readonly { readonly url: string; readonly fileName: string; readonly html: string }[] | undefined>
  writeIslandSnippets(
    root: string,
    buildId: string,
    snippets: readonly string[],
  ): Promise<string>
  readIslandSnippets(
    root: string,
    buildId: string,
  ): Promise<readonly string[] | undefined>
  write(root: string, buildId: string, manifest: ProjectManifest): Promise<string>
  read(root: string, buildId: string): Promise<ProjectManifest | undefined>
  clear(root: string, buildId: string): Promise<void>
}
