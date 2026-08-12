/** @typedef {import('svgo').Config} Config */

import path from "node:path"
import { NodeSpriteBuilder } from "../../../adapters/sprite/index.js"

/**
 * @param {string} targetDir
 * @param {Config} [config]
 * @returns {Promise<string>}
 */
export async function generateSprite(targetDir, config) {
  return new NodeSpriteBuilder(path.dirname(targetDir), config).build(
    path.basename(targetDir),
  )
}
