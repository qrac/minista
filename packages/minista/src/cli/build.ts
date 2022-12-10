import type { RollupOutput } from "rollup"
import type { PluginOption } from "vite"
import path from "node:path"
import fs from "fs-extra"
import pc from "picocolors"
import {
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
  build as viteBuild,
  createLogger,
} from "vite"
import { default as pluginReact } from "@vitejs/plugin-react"
import { default as pluginMdx } from "@mdx-js/rollup"
import { parse as parseHtml } from "node-html-parser"
import beautify from "js-beautify"
import archiver from "archiver"

import type { InlineConfig } from "../config/index.js"
import type { ResolvedViteEntry } from "../config/vite.js"
import type { RunSsg, SsgPage } from "../server/ssg.js"
import { resolveConfig } from "../config/index.js"
import { pluginPreact } from "../plugins/preact.js"
import { pluginSvgr } from "../plugins/svgr.js"
import { pluginSprite } from "../plugins/sprite.js"
import { pluginFetch } from "../plugins/fetch.js"
import { pluginSsg } from "../plugins/ssg.js"
import { pluginEntry } from "../plugins/entry.js"
import { pluginPartial } from "../plugins/partial.js"
import { pluginHydrate } from "../plugins/hydrate.js"
import { pluginBundle } from "../plugins/bundle.js"
import { pluginSearch } from "../plugins/search.js"
import { transformSearch } from "../transform/search.js"
import { transformDelivery } from "../transform/delivery.js"
import { transformEncode } from "../transform/encode.js"
import {
  getRelativeAssetPath,
  getBasedAssetPath,
  isLocalPath,
} from "../utility/path.js"

export type BuildResult = {
  output: BuildItem[]
}

type BuildItem = RollupOutput["output"][0] & {
  source?: string
  code?: string
}

type GenerateItem = {
  fileName: string
  data: string
}

export async function build(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig)
  const { assets, search, delivery } = config.main
  const { resolvedRoot, tempDir } = config.sub

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
  let ssgLinks: ResolvedViteEntry = {}
  let ssgScripts: ResolvedViteEntry = {}
  let ssgEntries: ResolvedViteEntry = {}

  let htmlItems: GenerateItem[]
  let generateItems: GenerateItem[]

  let hasPublic = false
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
        pluginMdx(config.mdx) as PluginOption,
        pluginSvgr(config),
        pluginSprite(config, true),
        pluginFetch(config),
        pluginSsg(),
        pluginPartial(config),
      ],
      customLogger: createLogger("warn", { prefix: "[minista]" }),
    })
  )

  async function getHtmlItems(ssgItem: BuildItem) {
    const ssgPath = path.join(tempDir, "ssg.mjs")
    const ssgData = ssgItem.source || ssgItem.code || ""

    if (!ssgData) {
      return []
    }
    await fs.outputFile(ssgPath, ssgData)

    const { runSsg }: { runSsg: RunSsg } = await import(ssgPath)
    ssgPages = await runSsg(config)

    if (ssgPages.length === 0) {
      return []
    }

    return ssgPages.map((page) => {
      const pathname = page.path

      let parsedHtml = parseHtml(page.html, { comment: true })

      const links = parsedHtml.querySelectorAll("link").filter((el) => {
        const url = el.getAttribute("href") || ""
        return isLocalPath(resolvedRoot, url)
      }) as unknown as HTMLElement[]

      const scripts = parsedHtml.querySelectorAll("script").filter((el) => {
        const url = el.getAttribute("src") || ""
        return isLocalPath(resolvedRoot, url)
      }) as unknown as HTMLElement[]

      const images = parsedHtml.querySelectorAll(
        "img, source, use"
      ) as unknown as HTMLElement[]

      const rootImagesDir = path.join("/", assets.images.outDir)
      const rootIconsDir = path.join("/", assets.icons.outDir)

      function registerSsgEntry(
        el: HTMLElement,
        selfEntries: { [key: string]: string },
        otherEntries: { [key: string]: string }
      ) {
        const tagName = el.tagName.toLowerCase()
        const isScript = tagName === "script"
        const srcAttr = isScript ? "src" : "href"
        const outExt = isScript ? "js" : "css"

        let src = ""
        src = el.getAttribute(srcAttr) || ""
        src = path.join(resolvedRoot, src)

        let name = ""
        name = el.getAttribute("data-minista-entry-name") || ""
        name = name ? name : path.parse(src).name

        let attributes = ""
        attributes = el.getAttribute("data-minista-entry-attributes") || ""

        let assetPath = ""
        assetPath = path.join(assets.outDir, name + "." + outExt)
        assetPath = getBasedAssetPath({
          base: config.main.base,
          pathname,
          assetPath,
        })

        if (isScript && attributes) {
          el.removeAttribute("type")
        }
        if (attributes && attributes !== "false") {
          const attrStrArray = attributes.split(/\s+/)

          let attrObj: { [key: string]: string } = {}

          attrStrArray.map((attrStr) => {
            const parts = attrStr.split("=")
            const key = parts[0]
            const value = parts[1].replace(/\"/g, "")
            return (attrObj[key] = value)
          })
          for (const key in attrObj) {
            el.setAttribute(key, attrObj[key])
          }
        }

        el.setAttribute(srcAttr, assetPath)
        el.removeAttribute("data-minista-entry-name")
        el.removeAttribute("data-minista-entry-attributes")

        const duplicateName = `${name}-ministaDuplicateName0`

        if (Object.hasOwn(selfEntries, name)) {
          return
        }
        if (Object.hasOwn(selfEntries, duplicateName)) {
          return
        }
        if (Object.hasOwn(otherEntries, name)) {
          selfEntries[duplicateName] = src
          return
        }
        selfEntries[name] = src
        return
      }

      function toRelativePath(
        el: HTMLElement,
        attr: string,
        value: string,
        replaceDir: string
      ) {
        let _value = value
        _value = _value.replace(/\n/, "").trim()

        if (!value.includes(",") && value.startsWith(replaceDir)) {
          _value = getRelativeAssetPath({ pathname, assetPath: value })
          return el.setAttribute(attr, _value)
        }
        if (!value.includes(",")) {
          return
        }

        let hasRelative = false

        _value = _value
          .split(",")
          .map((s) => s.trim())
          .map((s) => {
            let [url, density] = s.split(/\s+/)

            if (url.startsWith(replaceDir)) {
              hasRelative = true
              url = getRelativeAssetPath({ pathname, assetPath: url })
            }
            return `${url} ${density}`
          })
          .join(", ")

        if (hasRelative) {
          return el.setAttribute(attr, _value)
        }
        return
      }

      links.map((el) => {
        return registerSsgEntry(el, ssgLinks, ssgScripts)
      })
      scripts.map((el) => {
        return registerSsgEntry(el, ssgScripts, ssgLinks)
      })

      if (config.main.base === "" || config.main.base === "./") {
        images.map((el) => {
          const src = el.getAttribute("src") || ""
          const srcset = el.getAttribute("srcset") || ""
          const href = el.getAttribute("href") || ""

          if (src) toRelativePath(el, "src", src, rootImagesDir)
          if (srcset) toRelativePath(el, "srcset", srcset, rootImagesDir)
          if (href) toRelativePath(el, "href", href, rootIconsDir)
          return
        })
      }

      const htmlStr = parsedHtml.toString()

      return {
        fileName: page.fileName,
        data: htmlStr,
      }
    })
  }

  ssgResult = (await viteBuild(ssgConfig)) as unknown as BuildResult
  ssgItems = ssgResult.output.filter((item) =>
    item.fileName.match(/__minista_plugin_ssg\.js$/)
  )
  htmlItems = ssgItems[0] ? await getHtmlItems(ssgItems[0]) : []
  ssgEntries = { ...ssgLinks, ...ssgScripts }

  const assetsConfig = mergeViteConfig(
    config.vite,
    defineViteConfig({
      build: { write: false },
      plugins: [
        pluginReact(),
        pluginMdx(config.mdx) as PluginOption,
        pluginSvgr(config),
        pluginSprite(config),
        pluginEntry(config, ssgEntries),
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
        pluginMdx(config.mdx) as PluginOption,
        pluginSvgr(config),
        pluginSprite(config),
        pluginHydrate(),
        pluginSearch(config),
      ],
      customLogger: createLogger("warn", { prefix: "[minista]" }),
    })
  )

  assetsResult = (await viteBuild(assetsConfig)) as unknown as BuildResult

  hasPublic = fs.existsSync(resolvedPublic)
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

  hasPublic && (await fs.copy(resolvedPublic, resolvedOut))

  assetItems = assetsResult.output.filter(
    (item) => !item.fileName.match(/__minista_plugin_bundle\.js$/)
  )
  hydrateItems = hydrateResult.output.filter((item) =>
    item.fileName.match(/__minista_plugin_hydrate\.js$/)
  )

  function optimizeItems(items: BuildItem[]) {
    return items
      .map((item) => {
        const isBundleCss = item.fileName.match(/__minista_plugin_bundle\.css$/)
        const isBugBundleCss = item.fileName === bugBundleCssName
        const isHydrateJs = item.fileName.match(/__minista_plugin_hydrate\.js$/)

        let fileName = item.fileName
        fileName = fileName.replace(/-ministaDuplicateName\d*/, "")
        isBundleCss && (fileName = bundleCssName)
        isBugBundleCss && (fileName = bundleCssName)
        isHydrateJs && (fileName = hydrateJsName)

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
  }

  generateItems = optimizeItems([...assetItems, ...hydrateItems])
  generateItems = [...htmlItems, ...generateItems]

  if (hasSearch && ssgPages.length) {
    const fileName = path.join(search.outDir, search.outName + ".json")
    const searchObj = await transformSearch({ ssgPages, config })
    const data = JSON.stringify(searchObj)

    generateItems.push({ fileName, data })
  }

  const distItemNames = generateItems.map((item) => item.fileName)
  const archiveItemNames = delivery.archives.map((item) =>
    path.join(item.outDir, item.outName + "." + item.format)
  )
  const mergedItemNames = [...distItemNames, ...archiveItemNames]
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

        const bundleAttr = "data-minista-build-bundle-href"
        const bundleEl = parsedHtml
          .querySelectorAll("link")
          .find((el) => el.hasAttribute(bundleAttr))
        const bundlePath = bundleEl?.getAttribute(bundleAttr) || ""

        const hydrateAttr = "data-minista-build-hydrate-src"
        const hydrateEl = parsedHtml
          .querySelectorAll("script")
          .find((el) => el.hasAttribute(hydrateAttr))
        const hydratePath = hydrateEl?.getAttribute(hydrateAttr) || ""

        const partialAttr = `[data-${assets.partial.rootAttrSuffix}]`
        const partialEl = parsedHtml.querySelector(partialAttr)

        const targetAttr = "data-minista-transform-target"
        const deliListAttr = `[${targetAttr}="delivery-list"]`

        if (hasBundleCss) {
          bundleEl?.removeAttribute(bundleAttr)
          bundleEl?.setAttribute("href", bundlePath)
        } else {
          bundleEl?.remove()
        }

        if (partialEl) {
          hydrateEl?.removeAttribute(hydrateAttr)
          hydrateEl?.setAttribute("src", hydratePath)
        } else {
          hydrateEl?.remove()
        }

        data = parsedHtml.toString()

        if (parsedHtml.querySelector(deliListAttr)) {
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
