import type { HtmlDocument, PageId } from "../../core/document/index.js"

export interface SsgAssetPlan {
  readonly cssFiles: readonly string[]
  readonly imageFiles: readonly string[]
  readonly rewriteRootImages: boolean
}

export interface SsgAssetOutputResolver {
  resolve(fileName: string, pageId: PageId): string | undefined
}

export declare function collectSsgAssetOutputReferences(
  document: HtmlDocument,
  plan: SsgAssetPlan,
): readonly string[]
export declare function composeSsgAssetDocument(
  document: HtmlDocument,
  plan: SsgAssetPlan,
  outputs: SsgAssetOutputResolver,
): number
