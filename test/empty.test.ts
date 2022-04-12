import { describe, expect, it } from "vitest"
import fs from "fs-extra"

import { emptyResolveDir } from "../src/empty"

describe("emptyResolveDir", () => {
  it("Test: emptyResolveDir", async () => {
    const targetDir = "./user/node_modules/.minista"
    await emptyResolveDir(targetDir)
    const result = await fs.emptyDir(targetDir)

    expect(result).toBeTruthy()
  })
})
