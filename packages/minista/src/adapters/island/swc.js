// @ts-check

import { transformDirectives } from "../../plugins/island/utils/directive.js"

export class SwcIslandSourceTransformer {
  /**
   * @param {string} code
   * @param {string} moduleId
   * @param {import("../../features/island/index.js").IslandFeatureOptions} options
   */
  transform(code, moduleId, options) {
    return transformDirectives(code, moduleId, options)
  }
}
