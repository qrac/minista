import { describe, expect, it } from "vitest"

import { transformPartial } from "../../src/transform/partial"

describe("transformPartial", () => {
  it("Default", () => {
    const style = JSON.stringify({ display: "contents" })
    const result = transformPartial({
      originalId: "/test/module.js",
      rootDOMElement: "div",
      dataAttr: `data-partial-hydration="ph-1"`,
      style,
    })

    //console.log(result)
    expect(result).toEqual(
      `import App from "/test/module.js"
export default function () {
  return (
    <div data-partial-hydration="ph-1" style={{"display":"contents"}}>
      <App />
    </div>
  )
}`
    )
  })
})
