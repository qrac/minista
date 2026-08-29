import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, test } from "vitest"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "../../../..")

/** @param {string} file */
function readPackage(file) {
  return JSON.parse(fs.readFileSync(path.resolve(root, file), "utf8"))
}

describe("release package metadata", () => {
  test("keeps a broad Vite peer range and aligns the scaffold toolchain", () => {
    const workspace = readPackage("package.json")
    const minista = readPackage("packages/minista/package.json")
    const createMinista = readPackage("packages/create-minista/package.json")
    const minimalJs = readPackage(
      "packages/create-minista/templates/minimal-js/package.json",
    )
    const minimalTs = readPackage(
      "packages/create-minista/templates/minimal-ts/package.json",
    )
    const vite = readPackage("node_modules/vite/package.json")

    expect(minista.peerDependencies.vite).toBe("^8.0.0")
    expect(minimalJs.devDependencies.vite).toBe(workspace.devDependencies.vite)
    expect(minimalTs.devDependencies.vite).toBe(workspace.devDependencies.vite)

    expect(minista.engines.node).toBe(vite.engines.node)
    expect(createMinista.engines.node).toBe(minista.engines.node)
    expect(minimalJs.engines.node).toBe(minista.engines.node)
    expect(minimalTs.engines.node).toBe(minista.engines.node)
  })
})
