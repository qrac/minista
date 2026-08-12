import type {
  ArchiveBuilder,
  ArchiveOptions,
} from "../../features/archive/index.js"

export declare class NodeArchiveBuilder implements ArchiveBuilder {
  constructor(rootDir: string)
  build(options: ArchiveOptions): Promise<Uint8Array>
}
