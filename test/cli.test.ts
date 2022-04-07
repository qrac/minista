import { describe, expect, it } from "vitest"
import pc from "picocolors"

//prettier-ignore
describe("pc", () => {
  it("Test: pc", () => {
    const result = 1+1

    /*console.log(`${pc.bold(pc.green("BUILD"))} ${pc.bold("dist/issues/index.html")}`)
    console.log(`${pc.bold(pc.green("BUILD"))} ${pc.bold("dist/issues/28/index.html")}`)
    console.log(`${pc.bold(pc.green("BUILD"))} ${pc.bold("dist/issues/30/index.html")}`)
    console.log(`${pc.bold(pc.green("BUILD"))} ${pc.bold("dist/issues/27/index.html")}`)
    console.log(`${pc.bold(pc.green("BUILD"))} ${pc.bold("dist/issues/29/index.html")}`)
    console.log(`${pc.bold(pc.green("BUILD"))} ${pc.bold("dist/issues/33/index.html")}`)
    console.log(`${pc.bold(pc.cyan("DLIMG"))} ${pc.bold("dist/assets/images/remote-1.jpg")}`)
    console.log(`${pc.bold(pc.cyan("DLIMG"))} ${pc.bold("dist/assets/images/remote-2.jpg")}`)
    console.log(`${pc.bold(pc.red("ERROR"))} ${pc.red("dist/assets/images/remote-3.jpg")}`)
    console.log(`${pc.bold(pc.cyan("REIMG"))} ${pc.bold("dist/issues/28/index.html")}`)
    console.log(`${pc.bold(pc.cyan("REIMG"))} ${pc.bold("dist/issues/30/index.html")}`)
    console.log(`${pc.bold(pc.cyan("REIMG"))} ${pc.bold("dist/issues/27/index.html")}`)
    console.log(`${pc.bold(pc.blue("BEAUT"))} ${pc.bold("dist/issues/index.html")}`)
    console.log(`${pc.bold(pc.blue("BEAUT"))} ${pc.bold("dist/issues/28/index.html")}`)
    console.log(`${pc.bold(pc.blue("BEAUT"))} ${pc.bold("dist/issues/30/index.html")}`)
    console.log(`${pc.bold(pc.blue("BEAUT"))} ${pc.bold("dist/issues/27/index.html")}`)
    console.log(`${pc.bold(pc.blue("BEAUT"))} ${pc.bold("dist/issues/29/index.html")}`)
    console.log(`${pc.bold(pc.blue("BEAUT"))} ${pc.bold("dist/issues/33/index.html")}`)*/

    expect(result).toBe(2)
  })
})
