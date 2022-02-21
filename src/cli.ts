import fs from "fs-extra"
import { cac } from "cac"

import { getConfig } from "./config.js"
import { getViteConfig } from "./vite.js"
import { getMdxConfig } from "./mdx.js"
import { getFilePath, getFilePaths, getSameFilePaths } from "./path.js"
import { emptyResolveDir } from "./empty.js"
import { cleanHtmlPages } from "./clean.js"
import { createDevServer } from "./server.js"
import {
  buildTempPages,
  buildStaticPages,
  buildCopyDir,
  buildTempCss,
  buildAssetsTagStr,
} from "./build.js"

function printVersion() {
  const pkgURL = new URL("../package.json", import.meta.url)
  const pkg = JSON.parse(fs.readFileSync(pkgURL, "utf8"))
  const pkgVersion = pkg.version
  return pkgVersion
}

const cli = cac("minista")

cli
  .command("[root]")
  .alias("dev")
  .action(async () => {
    try {
      const viteConfig = await getViteConfig()
      await createDevServer(viteConfig)
    } catch (err) {
      console.log(err)
      process.exit(1)
    }
  })

cli.command("build [root]").action(async () => {
  try {
    const config = await getConfig()
    const viteConfig = await getViteConfig()
    const mdxConfig = await getMdxConfig()

    const generateTempRoot = async () => {
      const srcRootFilePaths = await getSameFilePaths(
        config.rootFileDir,
        config.rootFileName,
        config.rootFileExt
      )
      if (srcRootFilePaths.length > 0) {
        await buildTempPages([srcRootFilePaths[0]], {
          outbase: config.rootFileDir,
          outdir: config.tempRootFileDir,
          mdxConfig: mdxConfig,
        })
      }
    }

    const generateTempPages = async () => {
      const srcPageFilePaths = await getFilePaths(
        config.pagesDir,
        config.pagesExt
      )
      await buildTempPages(srcPageFilePaths, {
        outbase: config.pagesDir,
        outdir: config.tempPagesDir,
        mdxConfig: mdxConfig,
      })
    }

    const generateHtmlPages = async () => {
      const tempPageFilePaths = await getFilePaths(config.tempPagesDir, "mjs")
      const tempRootFilePath = getFilePath(
        config.tempRootFileDir,
        config.rootFileName,
        "mjs"
      )
      const tempAssetsFilePaths = await getFilePaths(config.tempAssetsDir, [
        "css",
        "js",
      ])
      const assetsTagStr = await buildAssetsTagStr(tempAssetsFilePaths, {
        outbase: config.tempAssetsDir,
        outdir: config.assetsDir,
      })
      await buildStaticPages(
        tempPageFilePaths,
        tempRootFilePath,
        {
          outbase: config.tempPagesDir,
          outdir: config.outDir,
        },
        assetsTagStr
      )
    }

    const generateAssets = async () => {
      await buildTempCss(viteConfig, {
        fileName: config.autoAssetsName,
        outdir: config.tempAssetsDir,
      })
      await buildCopyDir(
        config.tempAssetsDir,
        `${config.outDir}/${config.assetsDir}`,
        "assets"
      )
    }

    const generatePublic = async () => {
      await buildCopyDir(config.publicDir, config.outDir, "public")
    }

    await Promise.all([
      emptyResolveDir(config.tempRootFileDir),
      emptyResolveDir(config.tempAssetsDir),
      emptyResolveDir(config.tempPagesDir),
      emptyResolveDir(config.outDir),
    ])
    await Promise.all([
      generateTempRoot(),
      generateTempPages(),
      generateAssets(),
    ])
    await Promise.all([generateHtmlPages(), generatePublic()])

    const htmlPageFilePaths = await getFilePaths(config.outDir, "html")
    await cleanHtmlPages(htmlPageFilePaths)
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
})

cli.help()
cli.version(printVersion())
cli.parse()
