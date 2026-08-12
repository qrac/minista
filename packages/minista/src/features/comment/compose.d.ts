import type { HtmlDocument } from "../../core/document/index.js"
import type { FeatureId } from "../../core/graph/index.js"
import type { MinistaFeature } from "../../core/lifecycle/index.js"

export interface CommentFeatureOptions {}

export declare const COMMENT_FEATURE_ID: FeatureId

export declare function composeCommentDocument(document: HtmlDocument): number

export declare function createCommentFeature(
  options?: CommentFeatureOptions,
): MinistaFeature<CommentFeatureOptions>
