import type { HtmlDocument, HtmlElement } from "../../core/document/index.js"
import type { SsgAssetOutputResolver } from "./assets.js"

export declare function composeSsgPublicAssetDocument(
  document: HtmlDocument,
  publicFiles: ReadonlySet<string>,
  outputs: SsgAssetOutputResolver,
  excluded?: ReadonlySet<HtmlElement>,
): number
