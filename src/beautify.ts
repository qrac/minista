import fs from "fs-extra"
import pc from "picocolors"
import beautify from "js-beautify"
import type {
  HTMLBeautifyOptions,
  CSSBeautifyOptions,
  JSBeautifyOptions,
} from "js-beautify"

import type { MinistaBeautifyConfig, MinistaUserConfig } from "./types.js"

export const defaultBeautifyConfig: MinistaBeautifyConfig = {
  useHtml: true,
  useCss: false,
  useJs: false,
  htmlOptions: {
    indent_size: 2,
    max_preserve_newlines: 0,
    indent_inner_html: true,
    extra_liners: [],
  },
  cssOptions: {},
  jsOptions: {},
}

export async function getBeautifyConfig(
  userConfig: MinistaUserConfig
): Promise<MinistaBeautifyConfig> {
  const mergedConfig = userConfig.beautify
    ? { ...defaultBeautifyConfig, ...userConfig.beautify }
    : defaultBeautifyConfig
  return mergedConfig
}

export async function beautifyFiles(
  entryPoints: string[],
  target: "html" | "css" | "js",
  options?: HTMLBeautifyOptions | CSSBeautifyOptions | JSBeautifyOptions
) {
  await Promise.all(
    entryPoints.map(async (entryPoint) => {
      await beautifyFile(entryPoint, target, options)
    })
  )
}

export async function beautifyFile(
  entryPoint: string,
  target: "html" | "css" | "js",
  options?: HTMLBeautifyOptions | CSSBeautifyOptions | JSBeautifyOptions
) {
  const source = await fs.readFile(entryPoint, "utf8")
  const fixdSource =
    target === "html"
      ? source.replace(
          /<div class="minista-comment" hidden="">(.+?)<\/div>/g,
          "\n<!-- $1 -->"
        )
      : source
  const runBeautify =
    target === "html"
      ? beautify.html
      : target === "css"
      ? beautify.css
      : beautify
  const result = runBeautify(fixdSource, options)

  await fs
    .outputFile(entryPoint, result)
    .then(() => {
      console.log(`${pc.bold(pc.blue("BEAUT"))} ${pc.bold(entryPoint)}`)
    })
    .catch((err) => {
      console.error(err)
    })
}
