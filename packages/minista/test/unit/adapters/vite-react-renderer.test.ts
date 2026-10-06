import { describe, expect, test } from "vitest"

import { ReactRenderToStringRenderer } from "../../../src/adapters/react/index.js"
import {
  createViteReactRenderer,
  hasPreactAlias,
} from "../../../src/adapters/vite/react-renderer.js"

describe("Vite React renderer selection", () => {
  test("selects the React static renderer by default", async () => {
    const renderer = await createViteReactRenderer({})

    expect(renderer.constructor.name).toBe("ReactStaticRenderer")
  })

  test("selects the compatibility renderer for object-form Preact aliases", async () => {
    const config = {
      resolve: {
        alias: {
          react: "preact/compat",
          "react-dom": "preact/compat",
        },
      },
    }

    expect(hasPreactAlias(config)).toBe(true)
    await expect(createViteReactRenderer(config)).resolves.toBeInstanceOf(
      ReactRenderToStringRenderer,
    )
  })

  test("recognizes array-form Preact aliases", () => {
    expect(
      hasPreactAlias({
        resolve: {
          alias: [{ find: "react", replacement: "preact/compat" }],
        },
      }),
    ).toBe(true)
  })

  test("does not classify unrelated aliases as Preact", () => {
    expect(
      hasPreactAlias({
        resolve: {
          alias: { "@": "/project/src" },
        },
      }),
    ).toBe(false)
  })
})
