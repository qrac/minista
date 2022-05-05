import type { Loader as EsbuildLoader } from "esbuild"
import type { Options as MdxOptions } from "@mdx-js/esbuild"
import type { Config as SvgrOptions } from "@svgr/core"
import type { InlineConfig } from "vite"

import fs from "fs-extra"
import path from "path"
import url from "url"
import pc from "picocolors"
import { Fragment } from "react"
import { build as esBuild, Loader } from "esbuild"
import mdx from "@mdx-js/esbuild"
import { build as viteBuild, mergeConfig as mergeViteConfig } from "vite"

import type {
  MinistaResolveConfig,
  MinistaLocation,
  RootStaticContent,
  RootEsmContent,
  RootJsxContent,
  GlobalStaticData,
  GetGlobalStaticData,
  PageEsmContent,
  PageJsxContent,
  StaticData,
  StaticDataItem,
  GetStaticData,
} from "./types.js"

import { systemConfig } from "./system.js"
import {
  resolvePlugin,
  svgrPlugin,
  rawPlugin,
  partialHydrationPlugin,
} from "./esbuild.js"
import { renderHtml } from "./render.js"
import { slashEnd } from "./utils.js"

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const externalExtentions = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "eot",
  "woff",
  "woff2",
]
const externalExtentionArray: [string, EsbuildLoader][] =
  externalExtentions.map((ext) => {
    return ["." + ext, "file"]
  })
const externalFileLoader = Object.fromEntries(externalExtentionArray)

export async function buildTempPages(
  entryPoints: string[],
  buildOptions: {
    outBase: string
    outDir: string
    mdxConfig: MdxOptions
    svgrOptions: SvgrOptions
  }
) {
  await esBuild({
    entryPoints: entryPoints,
    outbase: buildOptions.outBase,
    outdir: buildOptions.outDir,
    outExtension: { ".js": ".mjs" },
    bundle: true,
    format: "esm",
    platform: "node",
    inject: [
      path.resolve(__dirname + "/../lib/shim-react.js"),
      path.resolve(__dirname + "/../lib/shim-fetch.js"),
    ],
    loader: externalFileLoader,
    plugins: [
      mdx(buildOptions.mdxConfig),
      resolvePlugin({
        "react/jsx-runtime": "react/jsx-runtime.js",
      }),
      svgrPlugin(buildOptions.svgrOptions),
      rawPlugin(),
      partialHydrationPlugin({
        mdxConfig: buildOptions.mdxConfig,
        svgrOptions: buildOptions.svgrOptions,
      }),
    ],
  }).catch(() => process.exit(1))
}

export async function buildPartialHydrationComponent(
  entryPoint: string,
  buildOptions: {
    outFile: string
    mdxConfig: MdxOptions
    svgrOptions: SvgrOptions
  }
) {
  await esBuild({
    entryPoints: [entryPoint],
    outfile: buildOptions.outFile,
    bundle: true,
    format: "esm",
    platform: "node",
    inject: [
      path.resolve(__dirname + "/../lib/shim-react.js"),
      path.resolve(__dirname + "/../lib/shim-fetch.js"),
    ],
    loader: externalFileLoader,
    plugins: [
      mdx(buildOptions.mdxConfig),
      resolvePlugin({
        "react/jsx-runtime": "react/jsx-runtime.js",
      }),
      svgrPlugin(buildOptions.svgrOptions),
      rawPlugin(),
    ],
  }).catch(() => process.exit(1))
}

export async function buildStaticPages(
  entryPoints: string[],
  tempRootFilePath: string,
  buildOptions: {
    outBase: string
    outDir: string
  },
  assetsTagStr: string
) {
  const rootStaticContent = await buildRootEsmContent(tempRootFilePath)
  const winOutBase = buildOptions.outBase.replaceAll("/", "\\")
  await Promise.all(
    entryPoints.map(async (entryPoint) => {
      const extname = path.extname(entryPoint)
      const basename = path.basename(entryPoint, extname)
      const dirname = path
        .dirname(entryPoint)
        .replace(buildOptions.outBase, buildOptions.outDir)
        .replace(winOutBase, buildOptions.outDir)
      const filename = path.join(dirname, basename + ".html")

      await buildStaticPage(
        entryPoint,
        filename,
        rootStaticContent,
        assetsTagStr,
        buildOptions.outDir
      )
    })
  )
}

export async function buildRootEsmContent(tempRootFilePath: string) {
  const defaultRootEsmContent = {
    component: Fragment,
    staticData: { props: {} },
  }
  if (!tempRootFilePath) {
    return defaultRootEsmContent
  } else {
    const targetFilePath = url.pathToFileURL(tempRootFilePath).href
    const rootEsmContent: RootEsmContent = await import(targetFilePath)
    const rootJsxContent: RootJsxContent = rootEsmContent.default
      ? rootEsmContent.default
      : Fragment

    const staticData: GlobalStaticData = rootEsmContent.getStaticData
      ? await buildGlobalStaticData(rootEsmContent.getStaticData)
      : { props: {} }

    return { component: rootJsxContent, staticData: staticData }
  }
}

export async function buildGlobalStaticData(
  getGlobalStaticData: GetGlobalStaticData
) {
  const response = await getGlobalStaticData()
  return response
}

export async function buildStaticPage(
  entryPoint: string,
  outFile: string,
  rootStaticContent: RootStaticContent,
  assetsTagStr: string,
  outDir: string
) {
  const targetFilePath = url.pathToFileURL(entryPoint).href
  const pageEsmContent: PageEsmContent = await import(targetFilePath)
  const pageJsxContent: PageJsxContent = pageEsmContent.default
  const frontmatter = pageEsmContent.frontmatter
    ? pageEsmContent.frontmatter
    : undefined
  const defaultStaticDataItem = { props: {}, paths: {} }

  const staticData: StaticData = pageEsmContent.getStaticData
    ? await buildStaticData(pageEsmContent.getStaticData)
    : undefined

  if (!staticData) {
    const staticDataItem = defaultStaticDataItem
    return await buildHtmlPage(
      pageJsxContent,
      staticDataItem,
      outFile,
      rootStaticContent,
      assetsTagStr,
      frontmatter,
      outDir
    )
  }

  if ("props" in staticData && "paths" in staticData === false) {
    const staticDataItem = { ...defaultStaticDataItem, ...staticData }
    return await buildHtmlPage(
      pageJsxContent,
      staticDataItem,
      outFile,
      rootStaticContent,
      assetsTagStr,
      frontmatter,
      outDir
    )
  }

  if ("paths" in staticData) {
    const staticDataItem = { ...defaultStaticDataItem, ...staticData }

    let fixedOutfile = outFile
    for await (const [key, value] of Object.entries(staticDataItem.paths)) {
      const reg = new RegExp("\\[" + key + "\\]", "g")
      fixedOutfile = fixedOutfile.replace(reg, `${value}`)
    }

    return await buildHtmlPage(
      pageJsxContent,
      staticDataItem,
      fixedOutfile,
      rootStaticContent,
      assetsTagStr,
      frontmatter,
      outDir
    )
  }

  if (Array.isArray(staticData) && staticData.length > 0) {
    const entryPoints = staticData

    await Promise.all(
      entryPoints.map(async (entryPoint) => {
        const staticDataItem = { ...defaultStaticDataItem, ...entryPoint }

        let fixedOutfile = outFile
        for await (const [key, value] of Object.entries(staticDataItem.paths)) {
          const reg = new RegExp("\\[" + key + "\\]", "g")
          fixedOutfile = fixedOutfile.replace(reg, `${value}`)
        }

        return await buildHtmlPage(
          pageJsxContent,
          staticDataItem,
          fixedOutfile,
          rootStaticContent,
          assetsTagStr,
          frontmatter,
          outDir
        )
      })
    )
  }
}

export async function buildStaticData(getStaticData: GetStaticData) {
  const response = await getStaticData()
  return response
}

export async function buildHtmlPage(
  pageJsxContent: PageJsxContent,
  staticDataItem: StaticDataItem,
  routePath: string,
  rootStaticContent: RootStaticContent,
  assetsTagStr: string,
  frontmatter: any,
  outDir: string
) {
  if (frontmatter?.draft) {
    return
  }

  const RootComponent: any = rootStaticContent.component
  const globalStaticData = rootStaticContent.staticData
  const PageComponent: any = pageJsxContent
  const staticProps = staticDataItem.props

  const reg1 = new RegExp(`^${outDir}|index.html`, "g")
  const reg2 = new RegExp(`.html`, "g")
  const pathname = routePath.replace(reg1, "").replace(reg2, "")
  const location: MinistaLocation = { pathname: pathname }

  const RenderComponent = () => {
    if (RootComponent === Fragment) {
      return (
        <Fragment>
          {(() => {
            if (PageComponent === Fragment) {
              return <Fragment />
            } else {
              return (
                <PageComponent
                  {...globalStaticData?.props}
                  {...staticProps}
                  frontmatter={frontmatter}
                  location={location}
                />
              )
            }
          })()}
        </Fragment>
      )
    } else {
      return (
        <RootComponent
          {...globalStaticData?.props}
          {...staticProps}
          frontmatter={frontmatter}
          location={location}
        >
          {(() => {
            if (PageComponent === Fragment) {
              return <Fragment />
            } else {
              return (
                <PageComponent
                  {...globalStaticData?.props}
                  {...staticProps}
                  frontmatter={frontmatter}
                  location={location}
                />
              )
            }
          })()}
        </RootComponent>
      )
    }
  }

  const html = await renderHtml(<RenderComponent />, assetsTagStr)
  const replacedHtml = html.replace(
    /<div class="minista-comment" hidden="">(.+?)<\/div>/g,
    "\n<!-- $1 -->"
  )

  await fs
    .outputFile(routePath, replacedHtml)
    .then(() => {
      console.log(`${pc.bold(pc.green("BUILD"))} ${pc.bold(routePath)}`)
    })
    .catch((err) => {
      console.error(err)
    })
}

export async function buildTempAssets(
  viteConfig: InlineConfig,
  buildOptions: {
    bundleOutName: string
    outDir: string
    assetDir: string
  }
) {
  const customConfig = {
    build: {
      write: false,
      rollupOptions: {
        input: {
          __minista_bundle_assets: path.resolve(
            __dirname + "/../dist/bundle.js"
          ),
        },
      },
    },
  }
  const mergedConfig = mergeViteConfig(viteConfig, customConfig)

  const result: any = await viteBuild(mergedConfig)
  const items = result.output

  if (Array.isArray(items) && items.length > 0) {
    items.map((item) => {
      if (item.fileName.match(/__minista_bundle_assets\.css/)) {
        const customFileName =
          slashEnd(buildOptions.outDir) + buildOptions.bundleOutName + ".css"
        return item?.source && fs.outputFile(customFileName, item?.source)
      } else if (item.fileName.match(/__minista_bundle_assets\.js/)) {
        return
      } else {
        const customFileName =
          buildOptions.outDir + item.fileName.replace(buildOptions.assetDir, "")
        const customCode = item?.source
          ? item?.source
          : item?.code
          ? item?.code
          : ""
        return customCode && fs.outputFile(customFileName, customCode)
      }
    })
  }
}

export async function buildAssetsTagStr(
  entryPoints: string[],
  buildOptions: {
    outBase: string
    outDir: string
  }
) {
  const winOutBase = buildOptions.outBase.replaceAll("/", "\\")
  const assetsTags = entryPoints.map((entryPoint) => {
    const assetPath = entryPoint
      .replace(buildOptions.outBase, buildOptions.outDir)
      .replace(winOutBase, buildOptions.outDir)
      .replaceAll("\\", "/")
    if (assetPath.endsWith(".css")) {
      return `<link rel="stylesheet" href="${assetPath}">`
    } else if (assetPath.endsWith(".js")) {
      return `<script defer src="${assetPath}"></script>`
    }
  })
  const assetsTagStr = assetsTags.join("")
  return assetsTagStr
}

export async function buildViteImporterRoots(config: MinistaResolveConfig) {
  const outFile = systemConfig.temp.viteImporter.outDir + "/roots.js"
  const rootSrcDir = slashEnd(config.rootSrcDir)
  const rootSrcName = config.root.srcName
  const rootExtStr = config.root.srcExt.join()
  const template = `import { Fragment } from "react"
export const getRoots = () => {
  const ROOTS = import.meta.globEager("/${rootSrcDir}${rootSrcName}.{${rootExtStr}}")
  const roots =
    Object.keys(ROOTS).length === 0
      ? [{ RootComponent: Fragment, getGlobalStaticData: undefined }]
      : Object.keys(ROOTS).map((root) => {
          return {
            RootComponent: ROOTS[root].default ? ROOTS[root].default : Fragment,
            getGlobalStaticData: ROOTS[root].getStaticData
              ? ROOTS[root].getStaticData
              : undefined,
          }
        })
  return roots
}`
  await fs.outputFile(outFile, template).catch((err) => {
    console.error(err)
  })
}

export async function buildViteImporterRoutes(config: MinistaResolveConfig) {
  const outFile = systemConfig.temp.viteImporter.outDir + "/routes.js"
  const pagesDir = slashEnd(config.pagesSrcDir)
  const pagesExtStr = config.pages.srcExt.join()
  const pagesDirRegStr = config.pagesSrcDir.replace(/\//g, "\\/")
  const replacePagesStr = `.replace(/^\\/${pagesDirRegStr}\\//g, "${config.base}")`
  const replaceFileNameArray = config.pages.srcExt.map((ext) => {
    return `.replace(/\\index|\\.${ext}$/g, "")`
  })
  const replaceFileNameArrayStr = replaceFileNameArray.join("\n      ")
  const template = `export const getRoutes = () => {
  const ROUTES = import.meta.globEager("/${pagesDir}**/*.{${pagesExtStr}}")
  const routes = Object.keys(ROUTES).map((route) => {
    const routePath = route
      ${replacePagesStr}
      ${replaceFileNameArrayStr}
      .replace(/\\[\\.{3}.+\\]/, "*")
      .replace(/\\[(.+)\\]/, ":$1")
    return {
      routePath: routePath,
      PageComponent: ROUTES[route].default,
      getStaticData: ROUTES[route].getStaticData
        ? ROUTES[route].getStaticData
        : undefined,
      frontmatter: ROUTES[route].frontmatter
        ? ROUTES[route].frontmatter
        : undefined,
    }
  })
  return routes
}`
  await fs.outputFile(outFile, template).catch((err) => {
    console.error(err)
  })
}

export async function buildViteImporterAssets(entry: {
  [key: string]: string
}) {
  const outFile = systemConfig.temp.viteImporter.outDir + "/assets.js"
  const assetsPathArray = Object.values(entry)
  const filteredAssetsPathArray = assetsPathArray.filter((path) =>
    path.match(/\.(js|cjs|mjs|jsx|ts|tsx)$/)
  )
  const importArray = filteredAssetsPathArray.map((path) => {
    return `import("/${path}")`
  })
  const importArrayStr = importArray.join("\n  ")
  const template = `export const getAssets = () => {
  ${importArrayStr}
}`
  await fs.outputFile(outFile, template).catch((err) => {
    console.error(err)
  })
}

export async function buildViteImporterBlankAssets() {
  const outFile = systemConfig.temp.viteImporter.outDir + "/assets.js"
  const template = `export const getAssets = () => {
}`
  await fs.outputFile(outFile, template).catch((err) => {
    console.error(err)
  })
}

export async function buildCopyDir(
  targetDir: string,
  outDir: string,
  log?: "public" | "assets"
) {
  const checkTargetDir = await fs.pathExists(targetDir)
  if (checkTargetDir) {
    return await fs
      .copy(targetDir, outDir)
      .then(() => {
        if (log === "public") {
          console.log(
            `${pc.bold(pc.green("BUILD"))} ${pc.bold(
              targetDir + "/**/* -> " + outDir
            )}`
          )
        }
        if (log === "assets") {
          console.log(`${pc.bold(pc.green("BUILD"))} ${pc.bold(outDir)}`)
        }
      })
      .catch((err) => {
        console.error(err)
      })
  } else {
    return
  }
}
