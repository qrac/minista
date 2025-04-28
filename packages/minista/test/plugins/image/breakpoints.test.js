import { describe, it, expect } from "vitest"

import { resolveBreakpoints } from "../../../src/plugins/image/utils/breakpoints.js"

describe("resolveBreakpoints", () => {
  it("配列の場合は正の数値をフィルタし、width を上限にクランプ、重複排除、ソートして返す", () => {
    expect(resolveBreakpoints([300, 600, 300, 900], 800)).toEqual([
      300, 600, 800,
    ])
  })

  it("配列の場合は複数の幅超過値もすべて width にクランプされる", () => {
    expect(resolveBreakpoints([100, 500, 1000, 2000], 800)).toEqual([
      100, 500, 800,
    ])
  })

  it("オブジェクトで count=1 の場合は最大幅のみ返す", () => {
    expect(
      resolveBreakpoints({ count: 1, minWidth: 100, maxWidth: 500 }, 1000)
    ).toEqual([500])
  })

  it("count>=2 の場合は最小幅と最大幅を含む", () => {
    expect(
      resolveBreakpoints({ count: 2, minWidth: 100, maxWidth: 500 }, 1000)
    ).toEqual([100, 500])
  })

  it("count>=3 の場合は中間ステップも生成する", () => {
    expect(
      resolveBreakpoints({ count: 4, minWidth: 100, maxWidth: 500 }, 1000)
    ).toEqual([100, 233, 300, 500])
  })

  it("maxWidth は imageWidth 以下にクランプされる", () => {
    expect(
      resolveBreakpoints({ count: 2, minWidth: 100, maxWidth: 500 }, 400)
    ).toEqual([100, 400])
  })

  it("imageWidth < minWidth の場合は単一の値を返す", () => {
    expect(
      resolveBreakpoints({ count: 2, minWidth: 300, maxWidth: 500 }, 200)
    ).toEqual([200])
  })

  it("breakpoints が undefined の場合はデフォルトを適用", () => {
    expect(resolveBreakpoints(undefined, 800)).toEqual([800])
  })
})
