import type { RollupOutput } from "rollup"
import type { HTMLElement as NHTMLElement } from "node-html-parser"
import path from "node:path"
import fs from "fs-extra"
import {
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
  build as viteBuild,
  createLogger,
} from "vite"
import { parse as parseHtml } from "node-html-parser"

import type { InlineConfig } from "../config/index.js"
import type { ResolvedViteEntry } from "../config/entry.js"
import type { RunSsg } from "../server/ssg.js"
import type { SsgPages } from "../transform/ssg.js"
import type { CreatePages } from "../generate/page.js"
import type { CreateAssets } from "../generate/asset.js"
import type { CreateImages } from "../generate/image.js"
import type { CreateSprites } from "../generate/sprite.js"
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
import { transformDeliveries } from "../transform/delivery.js"
import { transformArchives } from "../transform/archive.js"
import { transformRemotes } from "../transform/remote.js"
import { transformEntries } from "../transform/entry.js"
import { transformImages } from "../transform/image.js"
import { transformIcons } from "../transform/icon.js"
import { transformRelative } from "../transform/relative.js"
import { transformSearch } from "../transform/search.js"
import { generatePublics } from "../generate/public.js"
import { generatePages } from "../generate/page.js"
import { generateAssets } from "../generate/asset.js"
import { generateImages } from "../generate/image.js"
import { generateSprites } from "../generate/sprite.js"
import { generateArchives } from "../generate/archive.js"
import { hasElement } from "../utility/element.js"

export type BuildResult = {
  output: BuildItem[]
}
type BuildItem = RollupOutput["output"][0] & {
  source?: string
  code?: string
}

type CssNameBugFix = { [key: string]: string }

export type ParsedPage = Omit<SsgPages[0], "html"> & {
  parsedHtml: NHTMLElement
}

export async function build(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)
  const { resolvedRoot, resolvedEntry, tempDir } = config.sub
  const { assets, search, delivery } = config.main
  const { partial } = assets

  const resolvedOut = path.join(resolvedRoot, config.main.out)

  const bundleCssName = path.join(assets.outDir, assets.bundle.outName + ".css")
  const bugBundleCssName = path.join(assets.outDir, "bundle.css")
  const hydrateJsName = path.join(assets.outDir, assets.partial.outName + ".js")

  let ssgResult: BuildResult
  let assetsResult: BuildResult
  let hydrateResult: BuildResult

  let ssgItems: BuildItem[]
  let assetItems: BuildItem[]
  let hydrateItems: BuildItem[]

  let ssgPages: SsgPages = []
  let parsedPages: ParsedPage[] = []

  let dynamicEntries: ResolvedViteEntry = {}
  let assetEntries: ResolvedViteEntry = {}

  let createPages: CreatePages = []
  let createAssets: CreateAssets = []
  let createImages: CreateImages = {}
  let createSprites: CreateSprites = {}

  let cssNameBugFix: CssNameBugFix = {}

  let hasBundleCss = false
  let hasHydrate = false
  let hasSearch = false

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
  ssgItems = ssgResult.output.filter((item) => {
    return item.fileName.match(/__minista_plugin_ssg\.js$/)
  })

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

    hasSearch = hasElement(parsedData, `[data-full-text-search]`)
    hasHydrate = hasElement(parsedData, `[data-${partial.rootAttrSuffix}]`)

    transformDeliveries({ parsedData, ssgPages, config })
    transformArchives({ parsedData, config })

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

    createPages = await Promise.all(
      parsedPages.map(async (page) => {
        const pathname = page.path
        let parsedHtml = page.parsedHtml

        if (config.main.base === "" || config.main.base === "./") {
          transformRelative({
            parsedHtml,
            pathname,
            config,
          })
        }
        return {
          fileName: page.fileName,
          data: parsedHtml.toString(),
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
  assetsResult = (await viteBuild(assetsConfig)) as unknown as BuildResult

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
  if (hasHydrate) {
    hydrateResult = (await viteBuild(hydrateConfig)) as unknown as BuildResult
  } else {
    hydrateResult = { output: [] }
  }

  assetItems = assetsResult.output.filter((item) => {
    return !item.fileName.match(/__minista_plugin_bundle\.js$/)
  })
  hydrateItems = hydrateResult.output.filter((item) => {
    return item.fileName.match(/__minista_plugin_hydrate\.js$/)
  })
  hasBundleCss = assetsResult.output.some((item) => {
    return item.fileName === bundleCssName || item.fileName === bugBundleCssName
  })
  cssNameBugFix = Object.fromEntries(
    Object.entries(assetEntries).map((item) => {
      return [
        path.join(assets.outDir, path.parse(item[1]).name + ".css"),
        path.join(assets.outDir, item[0] + ".css"),
      ]
    })
  )
  cssNameBugFix = { ...cssNameBugFix, ...{ [bugBundleCssName]: bundleCssName } }

  createAssets = [...assetItems, ...hydrateItems].map((item) => {
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
    data === "\n" && (data = "")

    return {
      fileName,
      data,
    }
  })
  createAssets = createAssets.filter((item) => item.data)

  if (hasSearch && ssgPages.length) {
    const fileName = path.join(search.outDir, search.outName + ".json")
    const searchObj = await transformSearch({
      command: "build",
      ssgPages,
      config,
    })
    const data = JSON.stringify(searchObj)
    createAssets.push({ fileName, data })
  }

  const pageNames = createPages.map((item) => item.fileName)
  const assetNames = createAssets.map((item) => item.fileName)
  const imageNames = Object.keys(createImages).map((item) => item)
  const iconNames = Object.keys(createSprites).map((item) => item)
  const archiveNames = delivery.archives.map((item) => {
    return path.join(item.outDir, item.outName + "." + item.format)
  })
  const mergedItemNames = [
    ...pageNames,
    ...assetNames,
    ...imageNames,
    ...iconNames,
    ...archiveNames,
  ]
  const nameLengths = mergedItemNames.map((item) => item.length)
  const maxNameLength = nameLengths.reduce((a, b) => (a > b ? a : b), 0)

  await fs.emptyDir(resolvedOut)
  await generatePublics({ config })
  await generatePages({ createPages, config, hasBundleCss, maxNameLength })
  await generateAssets({ createAssets, config, maxNameLength })
  await generateImages({ createImages, config, maxNameLength })
  await generateSprites({ createSprites, config, maxNameLength })
  await generateArchives({ config, maxNameLength })
}
