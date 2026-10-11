import type { MinistaFeature } from "../../core/lifecycle/index.js"
export interface PwaHtmlTags { manifest?: string; register?: string }
export declare function createPwaFeature(tags: PwaHtmlTags): MinistaFeature
