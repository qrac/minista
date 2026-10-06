import type { IslandEntryGenerator } from "../../features/island/index.js"

export declare class NodeIslandEntryGenerator implements IslandEntryGenerator {
  createSnippet: IslandEntryGenerator["createSnippet"]
  createEntry: IslandEntryGenerator["createEntry"]
}
