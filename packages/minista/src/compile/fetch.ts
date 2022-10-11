import { transformWithEsbuild } from "vite"

import type { GlobalFetch } from "../server/global.js"
import type { PageFetch } from "../server/pages.js"

export async function compileFetch(getStaticData: GlobalFetch | PageFetch) {
  let fncStr = "" + getStaticData

  const transformedFnc = await transformWithEsbuild(fncStr, "", {
    format: "esm",
    platform: "node",
    loader: "ts",
  })
  fncStr = transformedFnc.code

  fncStr = `const { fetch } = await import("undici")
  ${fncStr}
  return await getStaticData()`

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  const compiledFetch = new AsyncFunction("", fncStr) as GlobalFetch | PageFetch
  return compiledFetch
}

export async function compileGlobalFetch(getStaticData: GlobalFetch) {
  const compiledFetch = (await compileFetch(
    getStaticData
  )) as unknown as GlobalFetch
  return compiledFetch
}

export async function compilePageFetch(getStaticData: PageFetch) {
  const compiledFetch = (await compileFetch(
    getStaticData
  )) as unknown as PageFetch
  return compiledFetch
}
