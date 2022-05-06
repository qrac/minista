import fs from "fs-extra"
import { cac } from "cac"

import { MinistaCliDevOptions, MinistaCliPreviewOptions } from "./types.js"

import { getUserConfig } from "./user.js"
import { getConfig } from "./config.js"
import { systemConfig } from "./system.js"
import { getViteConfig } from "./vite.js"
import { getMdxConfig } from "./mdx.js"
import { emptyResolveDir } from "./empty.js"
import { createDevServer } from "./server.js"
import { previewLocal } from "./preview.js"
import {
  generateViteImporters,
  generateTempRoot,
  generateTempPages,
  generateAssets,
  generatePartialHydration,
  generateNoStyleTemp,
  generateHtmlPages,
  generatePublic,
  generateDownload,
  generateBeautify,
} from "./generate.js"

const cli = cac("minista")

interface GlobalCLIOptions {
  "--"?: string[]
}

function cleanOptions<Options extends GlobalCLIOptions>(
  options: Options
): Omit<Options, keyof GlobalCLIOptions> {
  const ret = { ...options }
  delete ret["--"]
  return ret
}

function printVersion() {
  const pkgURL = new URL("../package.json", import.meta.url)
  const pkg = JSON.parse(fs.readFileSync(pkgURL, "utf8"))
  const pkgVersion = pkg.version
  return pkgVersion
}

cli
  .command("[root]", "start dev server")
  .alias("dev")
  .option("--host [host]", `[string] specify hostname`)
  .option("--port <port>", `[number] specify port`)
  .option("--strictPort", `[boolean] exit if specified port is already in use`)
  .option("--https", `[boolean] use TLS + HTTP/2`)
  .option("--open [path]", `[boolean | string] open browser on startup`)
  .option("--cors", `[boolean] enable CORS`)
  .action(
    async (root: string, options: MinistaCliDevOptions & GlobalCLIOptions) => {
      try {
        const cliOptions = cleanOptions(options)
        const userConfig = await getUserConfig()
        const config = await getConfig(userConfig)
        const mdxConfig = await getMdxConfig(config)
        const viteConfig = await getViteConfig(config, mdxConfig, cliOptions)

        await Promise.all([
          emptyResolveDir(systemConfig.temp.viteImporter.outDir),
          emptyResolveDir(systemConfig.temp.icons.outDir),
        ])
        await generateViteImporters(config, viteConfig)

        await createDevServer(viteConfig)
      } catch (err) {
        console.log(err)
        process.exit(1)
      }
    }
  )

cli.command("build [root]", "build for production").action(async () => {
  try {
    const userConfig = await getUserConfig()
    const config = await getConfig(userConfig)
    const mdxConfig = await getMdxConfig(config)
    const viteConfig = await getViteConfig(config, mdxConfig)

    await Promise.all([
      emptyResolveDir(systemConfig.temp.root.outDir),
      emptyResolveDir(systemConfig.temp.assets.outDir),
      emptyResolveDir(systemConfig.temp.pages.outDir),
      emptyResolveDir(systemConfig.temp.viteImporter.outDir),
      emptyResolveDir(systemConfig.temp.partialHydration.outDir),
      emptyResolveDir(config.out),
    ])
    await Promise.all([generateViteImporters(config, viteConfig)])
    await Promise.all([
      generateTempRoot(config, mdxConfig),
      generateTempPages(config, mdxConfig),
      generateAssets(config, viteConfig),
    ])
    await Promise.all([
      generateNoStyleTemp(systemConfig.temp.root.outDir),
      generateNoStyleTemp(systemConfig.temp.pages.outDir),
      generatePartialHydration(config, mdxConfig, viteConfig),
    ])
    await Promise.all([generateHtmlPages(config), generatePublic(config)])
    await Promise.all([generateDownload(config)])
    await Promise.all([
      generateBeautify(config, "html"),
      generateBeautify(config, "css"),
      generateBeautify(config, "js"),
    ])
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
})

cli
  .command("preview [root]", "locally preview production build")
  .option("--host [host]", `[string] specify hostname`)
  .option("--port <port>", `[number] specify port`)
  .option("--strictPort", `[boolean] exit if specified port is already in use`)
  .option("--https", `[boolean] use TLS + HTTP/2`)
  .option("--open [path]", `[boolean | string] open browser on startup`)
  .action(
    async (
      root: string,
      options: MinistaCliPreviewOptions & GlobalCLIOptions
    ) => {
      try {
        const cliOptions = cleanOptions(options)
        const userConfig = await getUserConfig()
        const config = await getConfig(userConfig)
        const mdxConfig = await getMdxConfig(config)
        const viteConfig = await getViteConfig(config, mdxConfig, cliOptions)

        await previewLocal(viteConfig)
      } catch (err) {
        console.log(err)
        process.exit(1)
      }
    }
  )

cli.help()
cli.version(printVersion())
cli.parse()
