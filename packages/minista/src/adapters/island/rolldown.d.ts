import type { IslandSourceTransformer } from "../../features/island/index.js"

export declare class RolldownIslandSourceTransformer implements IslandSourceTransformer {
  constructor(parse: (code: string, options: { lang: "tsx" }) => unknown)
  transform: IslandSourceTransformer["transform"]
}
