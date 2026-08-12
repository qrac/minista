import type { ImageGenerator } from "../../features/image/index.js"

export declare class NodeImageGenerator implements ImageGenerator {
  constructor(rootDir: string, cacheDir: string, resizeOnly?: boolean)
  generate: ImageGenerator["generate"]
}
