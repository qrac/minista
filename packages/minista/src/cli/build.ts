import type { RollupOutput } from "rollup"
import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"
import fs from "fs-extra"
import pc from "picocolors"
import {
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
  build as viteBuild,
  createLogger,
} from "vite"
import { parse as parseHtml } from "node-html-parser"
import beautify from "js-beautify"
import archiver from "archiver"

import type { InlineConfig } from "../config/index.js"
import type { ResolvedViteEntry } from "../config/entry.js"
import type { RunSsg, SsgPage } from "../server/ssg.js"
import type { CreateImages } from "../generate/image.js"
import type { CreateSprites } from "../generate/sprite.js"
import { flags } from "../config/system.js"
import { resolveConfig } from "../config/index.js"
import { resolveViteEntry } from "../config/entry.js"
import { pluginReact } from "../plugins/react.js"
import { pluginPreact } from "../plugins/preact.js"
import { pluginMdx } from "../plugins/mdx.js"
import { pluginImage } from "../plugins/image.js"
import { pluginSvgr } from "../plugins/svgr.js"
import { pluginIcon } from "../plugins/icon.js"
import { pluginFetch } from "../plugins/fetch.js"
import { pluginSsg } from "../plugins/ssg.js"
import { pluginPartial } from "../plugins/partial.js"
import { pluginHydrate } from "../plugins/hydrate.js"
import { pluginBundle } from "../plugins/bundle.js"
import { pluginSearch } from "../plugins/search.js"
import { transformRemotes } from "../transform/remote.js"
import { transformEntries } from "../transform/entry.js"
import { transformImages } from "../transform/image.js"
import { transformIcons } from "../transform/icon.js"
import { transformRelative } from "../transform/relative.js"
import { transformSearch } from "../transform/search.js"
import { transformDelivery } from "../transform/delivery.js"
import { transformEncode } from "../transform/encode.js"
import { generateImages } from "../generate/image.js"
import { generateSprites } from "../generate/sprite.js"

export type BuildResult = {
  output: BuildItem[]
}
type BuildItem = RollupOutput["output"][0] & {
  source?: string
  code?: string
}

type CssNameBugFix = { [key: string]: string }

export type ParsedPage = Omit<SsgPage, "html"> & { parsedHtml: NHTMLElement }

type GenerateItem = {
  fileName: string
  data: string
}

export async function build(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)
  const { assets, search, delivery } = config.main
  const { resolvedRoot, resolvedEntry, tempDir } = config.sub

  const resolvedOut = path.join(resolvedRoot, config.main.out)
  const resolvedPublic = path.join(resolvedRoot, config.main.public)

  const bundleCssName = path.join(assets.outDir, assets.bundle.outName + ".css")
  const bugBundleCssName = path.join(assets.outDir, "bundle.css")
  const hydrateJsName = path.join(assets.outDir, assets.partial.outName + ".js")

  let ssgResult: BuildResult
  let assetsResult: BuildResult
  let hydrateResult: BuildResult

  let ssgItems: BuildItem[]
  let assetItems: BuildItem[]
  let hydrateItems: BuildItem[]

  let ssgPages: SsgPage[] = []
  let parsedPages: ParsedPage[] = []

  let dynamicEntries: ResolvedViteEntry = {}
  let assetEntries: ResolvedViteEntry = {}

  let createImages: CreateImages = {}
  let createSprites: CreateSprites = {}

  let htmlItems: GenerateItem[] = []
  let generateItems: GenerateItem[] = []

  let cssNameBugFix: CssNameBugFix = {}

  let hasBundleCss = false
  let hasHydrate = false
  let hasSearch = false
  let hasPublic = false

  const ssgConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: { write: false, ssr: true, minify: false },
      ssr: { noExternal: "minista" },
      plugins: [
        pluginReact(),
        pluginMdx(config),
        pluginImage(config),
        pluginSvgr(config),
        pluginIcon(config),
        pluginFetch(config),
        pluginSsg(),
        pluginPartial(config),
      ],
      customLogger: createLogger("warn", { prefix: "[minista]" }),
    })
  )

  ssgResult = (await viteBuild(ssgConfig)) as unknown as BuildResult
  ssgItems = ssgResult.output.filter((item) =>
    item.fileName.match(/__minista_plugin_ssg\.js$/)
  )

  if (ssgItems.length > 0) {
    const ssgPath = path.join(tempDir, "ssg.mjs")
    const ssgData = ssgItems[0].source || ssgItems[0].code || ""
    await fs.outputFile(ssgPath, ssgData)
    const { runSsg }: { runSsg: RunSsg } = await import(ssgPath)
    ssgPages = await runSsg(config)
  }

  if (ssgPages.length > 0) {
    parsedPages = ssgPages.map((page) => {
      const parsedHtml = parseHtml(page.html, { comment: true }) as NHTMLElement
      return {
        fileName: page.fileName,
        path: page.path,
        title: page.path,
        parsedHtml,
      }
    })
    let parsedData = parsedPages.map((item) => item.parsedHtml)

    await transformRemotes({
      command: "build",
      parsedData,
      config,
    })
    await transformImages({
      command: "build",
      parsedData,
      config,
      createImages,
    })
    await transformIcons({
      command: "build",
      parsedData,
      config,
      createSprites,
    })
    await transformEntries({
      parsedData,
      config,
      dynamicEntries,
    })

    htmlItems = await Promise.all(
      parsedPages.map(async (page) => {
        const pathname = page.path

        let parsedHtml = page.parsedHtml

        if (config.main.base === "" || config.main.base === "./") {
          parsedHtml = transformRelative({
            parsedHtml,
            pathname,
            config,
          })
        }

        const htmlStr = parsedHtml.toString()

        return {
          fileName: page.fileName,
          data: htmlStr,
        }
      })
    )
  }

  assetEntries = resolveViteEntry(resolvedRoot, resolvedEntry)
  assetEntries = { ...assetEntries, ...dynamicEntries }

  const assetsConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: {
        rollupOptions: {
          input: assetEntries,
        },
        write: false,
      },
      plugins: [
        pluginReact(),
        pluginMdx(config),
        pluginSvgr(config),
        pluginBundle(),
      ],
      customLogger: createLogger("warn", { prefix: "[minista]" }),
    })
  )
  const hydrateConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: { write: false },
      plugins: [
        pluginReact(),
        pluginPreact(config),
        pluginMdx(config),
        pluginSvgr(config),
        pluginHydrate(),
        pluginSearch(config),
      ],
      customLogger: createLogger("warn", { prefix: "[minista]" }),
    })
  )

  assetsResult = (await viteBuild(assetsConfig)) as unknown as BuildResult

  hasBundleCss = assetsResult.output.some(
    (item) =>
      item.fileName === bundleCssName || item.fileName === bugBundleCssName
  )
  hasHydrate = fs.existsSync(path.join(tempDir, "phs"))
  hasSearch = fs.existsSync(path.join(tempDir, "search.txt"))

  if (hasHydrate) {
    hydrateResult = (await viteBuild(hydrateConfig)) as unknown as BuildResult
  } else {
    hydrateResult = { output: [] }
  }

  await fs.emptyDir(resolvedOut)

  hasPublic = fs.existsSync(resolvedPublic)
  hasPublic && (await fs.copy(resolvedPublic, resolvedOut))

  assetItems = assetsResult.output.filter(
    (item) => !item.fileName.match(/__minista_plugin_bundle\.js$/)
  )
  hydrateItems = hydrateResult.output.filter((item) =>
    item.fileName.match(/__minista_plugin_hydrate\.js$/)
  )

  cssNameBugFix = Object.fromEntries(
    Object.entries(assetEntries).map((item) => {
      return [
        path.join(assets.outDir, path.parse(item[1]).name + ".css"),
        path.join(assets.outDir, item[0] + ".css"),
      ]
    })
  )
  cssNameBugFix = { ...cssNameBugFix, ...{ [bugBundleCssName]: bundleCssName } }

  generateItems = [...assetItems, ...hydrateItems]
    .map((item) => {
      const isCss = item.fileName.match(/.*\.css$/)
      const isBundleCss = item.fileName.match(/__minista_plugin_bundle\.css$/)
      const isHydrateJs = item.fileName.match(/__minista_plugin_hydrate\.js$/)

      let fileName = item.fileName
      isBundleCss && (fileName = bundleCssName)
      isHydrateJs && (fileName = hydrateJsName)

      if (isCss && Object.hasOwn(cssNameBugFix, fileName)) {
        fileName = cssNameBugFix[fileName]
      }
      fileName = fileName.replace(/-ministaDuplicateName\d*/, "")

      let data = ""
      item.source && (data = item.source)
      item.code && (data = item.code)

      if (data === "\n") {
        data = ""
      }
      return {
        fileName,
        data,
      }
    })
    .filter((item) => item.data)

  generateItems = [...htmlItems, ...generateItems]

  if (hasSearch && ssgPages.length) {
    const fileName = path.join(search.outDir, search.outName + ".json")
    const searchObj = await transformSearch({ ssgPages, config })
    const data = JSON.stringify(searchObj)

    generateItems.push({ fileName, data })
  }

  const generateNames = generateItems.map((item) => item.fileName)
  const imageNames = Object.keys(createImages).map((item) => item)
  const iconNames = Object.keys(createSprites).map((item) => item)
  const archiveNames = delivery.archives.map((item) =>
    path.join(item.outDir, item.outName + "." + item.format)
  )
  const mergedItemNames = [
    ...generateNames,
    ...imageNames,
    ...iconNames,
    ...archiveNames,
  ]
  const nameLengths = mergedItemNames.map((item) => item.length)
  const maxNameLength = nameLengths.reduce((a, b) => (a > b ? a : b), 0)

  await Promise.all(
    generateItems.map(async (item) => {
      const isHtml = item.fileName.match(/.*\.html$/)
      const isCss = item.fileName.match(/.*\.css$/)
      const isJs = item.fileName.match(/.*\.js$/)

      let fileName = item.fileName
      let data: string | Buffer = item.data

      if (isHtml) {
        let parsedHtml = parseHtml(data, { comment: true })

        const bundleEl = parsedHtml.querySelector(`link[${flags.bundle}]`)

        if (hasBundleCss) {
          bundleEl?.removeAttribute(flags.bundle)
        } else {
          bundleEl?.remove()
        }

        const partialAttr = `[data-${assets.partial.rootAttrSuffix}]`
        const partialEl = parsedHtml.querySelector(partialAttr)
        const hydrateEl = parsedHtml.querySelector(`script[${flags.hydrate}]`)

        if (partialEl) {
          hydrateEl?.removeAttribute(flags.hydrate)
        } else {
          hydrateEl?.remove()
        }

        data = parsedHtml.toString()

        const targetAttr = "data-minista-transform-target"

        if (parsedHtml.querySelector(`[${targetAttr}="delivery-list"]`)) {
          data = transformDelivery({ html: data, ssgPages, config })
        }

        if (config.main.beautify.useHtml) {
          data = beautify.html(data, config.main.beautify.htmlOptions)
        }
      }

      if (isCss && config.main.beautify.useAssets) {
        data = beautify.css(data, config.main.beautify.cssOptions)
      }
      if (isJs && config.main.beautify.useAssets) {
        data = beautify.js(data, config.main.beautify.jsOptions)
      }

      if (isHtml) {
        const charsets = data.match(
          /<meta[^<>]*?charset=["|'](.*?)["|'].*?\/>/i
        )
        const charset = charsets ? charsets[1] : "UTF-8"

        if (!charset.match(/^utf[\s-_]*8$/i)) {
          data = transformEncode(data, charset)
        }
      }

      const nameLength = fileName.length
      const spaceCount = maxNameLength - nameLength + 3
      const space = " ".repeat(spaceCount)

      const routePath = path.join(resolvedRoot, config.main.out, fileName)
      const relativePath = path.relative(process.cwd(), routePath)
      const dataSize = (data.length / 1024).toFixed(2)

      return await fs
        .outputFile(routePath, data)
        .then(() => {
          console.log(
            `${pc.bold(pc.green("BUILD"))} ${pc.bold(relativePath)}` +
              space +
              pc.gray(`${dataSize} KiB`)
          )
        })
        .catch((err) => {
          console.error(err)
        })
    })
  )

  await generateImages({ createImages, config, maxNameLength })
  await generateSprites({ createSprites, config, maxNameLength })

  if (delivery.archives.length) {
    const cwd = path.relative(process.cwd(), resolvedRoot)
    const archivesDir = path.join(tempDir, "archives")

    await fs.emptyDir(archivesDir)

    await Promise.all(
      delivery.archives.map(async (item) => {
        const srcDir = item.srcDir
        const outFile = item.outName + "." + item.format
        const fileName = path.join(item.outDir, outFile)
        const archiveFile = path.join(archivesDir, fileName)

        await fs.ensureFile(archiveFile)
        const output = fs.createWriteStream(archiveFile)
        const options = item.options ? item.options : {}
        const ignore = item.ignore ? item.ignore : ""
        const archive = archiver(item.format, options)

        output.on("close", async () => {
          const nameLength = fileName.length
          const spaceCount = maxNameLength - nameLength + 3
          const space = " ".repeat(spaceCount)

          const routePath = path.join(resolvedRoot, config.main.out, fileName)
          const relativePath = path.relative(process.cwd(), routePath)
          const dataSize = (archive.pointer() / 1024).toFixed(2)

          return await fs
            .copy(archiveFile, routePath)
            .then(() => {
              console.log(
                `${pc.bold(pc.green("BUILD"))} ${pc.bold(relativePath)}` +
                  space +
                  pc.gray(`${dataSize} KiB`)
              )
            })
            .catch((err) => {
              console.error(err)
            })
        })

        archive.pipe(output)
        archive.glob(path.join(srcDir, "**/*"), { cwd, ignore })

        await archive.finalize()
        return
      })
    )
  }
}
