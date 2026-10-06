import { describe, expect, test } from "vitest"

import { ViteAppBuilderAdapter } from "../../src/adapters/vite/app-builder.js"
import { ViteEnvironmentInputAdapter } from "../../src/adapters/vite/environment-input.js"

/**
 * @param {any} result
 * @returns {any[]}
 */
function outputItems(result) {
  return (Array.isArray(result) ? result : [result]).flatMap(
    (output) => output.output ?? [],
  )
}

describe("Vite App Builder compatibility", () => {
  test("applies a client input after the render environment finishes", async () => {
    const inputs = new ViteEnvironmentInputAdapter()
    const virtualPlugin = {
      name: "minista-test:app-builder-virtual-input",
      /** @param {string} id */
      resolveId(id) {
        if (id.startsWith("virtual:minista-test:")) return `\0${id}`
      },
      /** @param {string} id */
      load(id) {
        if (id.startsWith("\0virtual:minista-test:")) {
          return `export default ${JSON.stringify(id)}`
        }
      },
    }

    const result = await new ViteAppBuilderAdapter().build(
      {
        configFile: false,
        root: process.cwd(),
        logLevel: "silent",
        plugins: [virtualPlugin],
        build: { write: false },
        environments: {
          render: {
            build: {
              rolldownOptions: {
                input: { render: "virtual:minista-test:render" },
              },
            },
          },
          client: {
            build: {
              rolldownOptions: {
                input: { client: "virtual:minista-test:initial-client" },
              },
            },
          },
        },
      },
      {
        prepareClient({ client, renderOutput }) {
          const renderEntry = outputItems(renderOutput).find(
            (item) => item.type === "chunk" && item.isEntry,
          )
          expect(renderEntry?.facadeModuleId).toBe(
            "\0virtual:minista-test:render",
          )
          inputs.apply(client, {
            client: "virtual:minista-test:prepared-client",
          })
        },
      },
    )

    const clientEntry = result.outputManifest.files.find(
      (item) => item.kind === "chunk" && item.isEntry,
    )
    expect(clientEntry?.logicalId).toBe("client")
  })
})
