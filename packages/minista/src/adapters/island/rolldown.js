// @ts-check

import { transformDirectives } from "../../plugins/island/utils/directive.js"

export class RolldownIslandSourceTransformer {
  /** @param {(code: string, options: {lang: "tsx"}) => unknown} parse */
  constructor(parse) {
    this.parse = parse
  }

  /**
   * @param {string} code
   * @param {string} moduleId
   * @param {import("../../features/island/index.js").IslandFeatureOptions} options
   */
  transform(code, moduleId, options) {
    return transformDirectives(code, moduleId, options, this.parse(code, { lang: "tsx" }))
  }
}
