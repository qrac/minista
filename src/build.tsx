import type { Loader as EsbuildLoader } from "esbuild"
import type { Options as MdxOptions } from "@mdx-js/esbuild"
import type { Config as SvgrOptions } from "@svgr/core"
import type { InlineConfig } from "vite"

import fs from "fs-extra"
import path from "path"
import url from "url"
import pc from "picocolors"
import { Fragment } from "react"
import { build as esBuild } from "esbuild"
import mdx from "@mdx-js/esbuild"
import {
  build as viteBuild,
  defineConfig as defineViteConfig,
  mergeConfig as mergeViteConfig,
} from "vite"

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
  PartialModules,
  PartialString,
} from "./types.js"

import { systemConfig } from "./system.js"
import { getFilePath } from "./path.js"
import {
  resolvePlugin,
  svgrPlugin,
  rawPlugin,
  partialHydrationPlugin,
} from "./esbuild.js"
import { renderHtml } from "./render.js"
import { slashEnd, reactStylesToString } from "./utils.js"

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ministaPkgUrl = path.resolve(__dirname + "/../package.json")
const ministaPkgUrlRelative = path.relative(".", ministaPkgUrl)
const ministaPkg = JSON.parse(fs.readFileSync(ministaPkgUrlRelative, "utf8"))
const userPkgPath = path.resolve("package.json")
const userPkgFilePath = path.relative(process.cwd(), userPkgPath)
const userPkg = JSON.parse(fs.readFileSync(userPkgFilePath, "utf8"))

const esbuildExternals = [
  ...Object.keys(ministaPkg.dependencies || {}),
  ...Object.keys(ministaPkg.devDependencies || {}),
  ...Object.keys(ministaPkg.peerDependencies || {}),
  ...Object.keys(userPkg.dependencies || {}),
  ...Object.keys(userPkg.devDependencies || {}),
  ...Object.keys(userPkg.peerDependencies || {}),
  "*.css",
  "*.scss",
  "*.sass",
  //"react",
  //"react/*",
  //"react-dom",
  //"react-dom/*",
  //"react-helmet",
  //"react-helmet/*",
]
const esbuildLoaders: { [key: string]: EsbuildLoader } = {
  ".jpg": "file",
  ".jpeg": "file",
  ".png": "file",
  ".gif": "file",
  ".webp": "file",
  ".avif": "file",
  ".eot": "file",
  ".woff": "file",
  ".woff2": "file",
}
const userPkgHasPreact = [
  ...Object.keys(userPkg.dependencies || {}),
  ...Object.keys(userPkg.devDependencies || {}),
].includes("preact")

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
    external: esbuildExternals,
    loader: esbuildLoaders,
    plugins: [
      mdx(buildOptions.mdxConfig),
      resolvePlugin({
        "react/jsx-runtime": "react/jsx-runtime.js",
      }),
      svgrPlugin(buildOptions.svgrOptions),
      rawPlugin(),
      partialHydrationPlugin(),
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

  const renderdHtml = await renderHtml(<RenderComponent />, assetsTagStr)

  const html = [renderdHtml]

  const stringInitial = getFilePath(
    systemConfig.temp.partialHydration.outDir,
    "string-initial",
    "json"
  )
  if (stringInitial) {
    const targetRelative = path.relative(".", stringInitial)
    const targetJson = JSON.parse(fs.readFileSync(targetRelative, "utf8"))
    const items: { id: string; html: string }[] = targetJson.items

    items.map((item) => {
      const dummy = `<div data-partial-hydration="${item.id}"></div>`
      const reg = new RegExp(`${dummy}`, "g")
      html[0] = html[0].replace(reg, item.html)
      return
    })
  }

  const replacedHtml = html[0].replace(
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
    input: string
    bundleOutName: string
    outDir: string
    assetDir: string
    generateJs: boolean
  }
) {
  const customConfig = defineViteConfig({
    build: {
      write: false,
      rollupOptions: {
        input: {
          __minista_bundle_assets: buildOptions.input,
        },
      },
    },
  })
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
        if (buildOptions.generateJs) {
          const customFileName =
            slashEnd(buildOptions.outDir) + buildOptions.bundleOutName + ".js"
          return item?.code && fs.outputFile(customFileName, item?.code)
        }
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

export async function buildPartialModules(
  moduleFilePaths: string[],
  config: MinistaResolveConfig
): Promise<PartialModules> {
  const moduleData: { id: string; importer: string }[] = []

  await Promise.all(
    moduleFilePaths.map(async (entryPoint) => {
      const entryPointRelative = path.relative(".", entryPoint)
      const underUniqueId = path.parse(entryPoint).name
      const importer = await fs.readFile(entryPointRelative, "utf8")
      moduleData.push({ id: underUniqueId, importer: importer })
      return
    })
  )
  const sortedModuleData = moduleData.sort((a, b) => {
    const nameA = a.importer.toUpperCase()
    const nameB = b.importer.toUpperCase()
    if (nameA < nameB) {
      return -1
    }
    if (nameA > nameB) {
      return 1
    }
    return 0
  })

  const rootStyle = config.assets.partial.rootStyle
  const hasRootStyle = Object.entries(rootStyle).length !== 0
  const partialModules: PartialModules = sortedModuleData.map((item, index) => {
    return {
      id: item.id,
      phId: `PH_${index + 1}`,
      phDomId: `${config.assets.partial.rootValuePrefix}-${index + 1}`,
      htmlId: `html_${index + 1}`,
      targetsId: `targets_${index + 1}`,
      importer: item.importer,
      rootAttr: `data-${config.assets.partial.rootAttrSuffix}`,
      rootDOMElement: config.assets.partial.rootDOMElement,
      rootStyleStr: hasRootStyle ? reactStylesToString(rootStyle) : "",
    }
  })
  return partialModules
}

export async function buildPartialStringIndex(
  partialModules: PartialModules,
  buildOptions: { outFile: string }
) {
  const tmpImporters: string[] = partialModules.map((module) => {
    return `import ${module.phId} from "${module.importer}"`
  })
  const tmpRenders: string[] = partialModules.map((module) => {
    return `// ${module.phId}
const ${module.htmlId} = renderToString(React.createElement(${module.phId}))`
  })
  const tmpExports: string[] = partialModules.map((module) => module.htmlId)

  const tmpImporterStr = tmpImporters.join("\n")
  const tmpRendersStr = tmpRenders.join("\n")
  const tmpExportsStr = tmpExports.join(", ")

  const outFile = buildOptions.outFile
  const template = `import { renderToString } from "react-dom/server.js"
${tmpImporterStr}

${tmpRendersStr}

export { ${tmpExportsStr} }`

  await fs.outputFile(outFile, template).catch((err) => {
    console.error(err)
  })
}

export async function buildPartialStringBundle(
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
      //path.resolve(__dirname + "/../lib/shim-fetch.js"),
    ],
    external: esbuildExternals,
    loader: esbuildLoaders,
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

export async function buildPartialStringInitial(
  entryPoint: string,
  partialModules: PartialModules,
  buildOptions: {
    outFile: string
  }
) {
  const outFile = buildOptions.outFile
  const targetFilePath = url.pathToFileURL(entryPoint).href
  const partialString: PartialString = await import(targetFilePath)

  const items = partialModules.map((module) => {
    const html = partialString[module.htmlId]
    const dom = module.rootDOMElement
    const dataId = `${module.rootAttr}="${module.phDomId}"`
    const style = module.rootStyleStr ? ` style="${module.rootStyleStr}"` : ""
    const replacedHtml = `<${dom} ${dataId}${style}>${html}</${dom}>`
    return {
      id: module.id,
      html: replacedHtml,
    }
  })
  const template = JSON.stringify({ items: items })

  await fs.outputFile(outFile, template).catch((err) => {
    console.error(err)
  })
}

export async function buildPartialHydrateIndex(
  partialModules: PartialModules,
  config: MinistaResolveConfig,
  buildOptions: { outFile: string }
) {
  const tmpImporters: string[] = partialModules.map((module) => {
    return `import ${module.phId} from "${module.importer}"`
  })
  const tempFunctionIntersectionObserver = `const options = {
      root: ${config.assets.partial.intersectionObserverOptions.root},
      rootMargin: "${config.assets.partial.intersectionObserverOptions.rootMargin}",
      thresholds: ${config.assets.partial.intersectionObserverOptions.thresholds},
    }
    const observer = new IntersectionObserver(hydrate, options)
    observer.observe(target)

    function hydrate() {
      ReactDOM.hydrate(App, target)
      observer.unobserve(target)
    }`
  const tempFunctionImmediateExecution = `ReactDOM.hydrate(App, target)`
  const tempFunction = config.assets.partial.useIntersectionObserver
    ? tempFunctionIntersectionObserver
    : tempFunctionImmediateExecution
  const tmpRenders: string[] = partialModules.map((module) => {
    return `
// ${module.phId}
const ${module.targetsId} = document.querySelectorAll('[${module.rootAttr}="${module.phDomId}"]')
if (${module.targetsId}) {
  ${module.targetsId}.forEach(target => {
    const App = React.createElement(${module.phId})
    ${tempFunction}
  })
}`
  })

  const tmpImporterStr = tmpImporters.join("\n")
  const tmpRendersStr = tmpRenders.join("\n")

  const outFile = buildOptions.outFile
  const template = `import React from "react"
import ReactDOM from "react-dom"
${tmpImporterStr}
${tmpRendersStr}`

  await fs.outputFile(outFile, template).catch((err) => {
    console.error(err)
  })
}

export async function buildPartialHydrateAssets(
  viteConfig: InlineConfig,
  buildOptions: {
    input: string
    bundleOutName: string
    outDir: string
    assetDir: string
    generateJs: boolean
    usePreact: boolean
  }
) {
  const activePreact = buildOptions.usePreact && userPkgHasPreact
  const resolveAliasPreact = {
    react: "preact/compat",
    "react-dom": "preact/compat",
  }
  const customConfig = defineViteConfig({
    base: viteConfig.base,
    build: {
      write: false,
      assetsInlineLimit: 0,
      minify: viteConfig.build?.minify,
      rollupOptions: {
        input: {
          __minista_bundle_assets: buildOptions.input,
        },
        output: {
          manualChunks: undefined,
        },
      },
    },
    esbuild: viteConfig.esbuild,
    plugins: viteConfig.plugins,
    resolve: {
      alias: activePreact ? resolveAliasPreact : {},
    },
    customLogger: viteConfig.customLogger,
  })

  const mergedConfig = mergeViteConfig({}, customConfig)

  const result: any = await viteBuild(mergedConfig)
  const items = result.output

  if (Array.isArray(items) && items.length > 0) {
    items.map((item) => {
      if (item.fileName.match(/\.css/)) {
        const customFileName =
          slashEnd(buildOptions.outDir) + buildOptions.bundleOutName + ".css"
        return item?.source && fs.outputFile(customFileName, item?.source)
      } else if (item.fileName.match(/\.js/)) {
        if (buildOptions.generateJs) {
          const customFileName =
            slashEnd(buildOptions.outDir) + buildOptions.bundleOutName + ".js"
          return item?.code && fs.outputFile(customFileName, item?.code)
        }
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
