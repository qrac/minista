import fs from "fs-extra"
import path from "path"
import url from "url"
import pc from "picocolors"
import { Fragment } from "react"
import { build as esBuild } from "esbuild"
import mdx from "@mdx-js/esbuild"
import type { Options as MdxOptions } from "@mdx-js/esbuild"
import { build as viteBuild, mergeConfig } from "vite"
import type { InlineConfig } from "vite"

import type {
  MinistaConfig,
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
import { resolvePlugin } from "./esbuild.js"
import { renderHtml } from "./render.js"

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function buildTempPages(
  entryPoints: string[],
  buildOptions: {
    outbase: string
    outdir: string
    mdxConfig: MdxOptions
  }
) {
  const ministaPkgURL = new URL(
    path.resolve(__dirname + "/../package.json"),
    import.meta.url
  )
  const ministaPkg = JSON.parse(fs.readFileSync(ministaPkgURL, "utf8"))
  const userPkgURL = new URL(path.resolve("package.json"), import.meta.url)
  const userPkg = JSON.parse(fs.readFileSync(userPkgURL, "utf8"))

  const esbuildExternal = [
    ...Object.keys(ministaPkg.dependencies || {}),
    ...Object.keys(ministaPkg.devDependencies || {}),
    ...Object.keys(ministaPkg.peerDependencies || {}),
    ...Object.keys(userPkg.dependencies || {}),
    ...Object.keys(userPkg.devDependencies || {}),
    ...Object.keys(userPkg.peerDependencies || {}),
    "*.css",
    "*.scss",
    "*.sass",
  ]

  await esBuild({
    entryPoints: entryPoints,
    outbase: buildOptions.outbase,
    outdir: buildOptions.outdir,
    outExtension: { ".js": ".mjs" },
    bundle: true,
    format: "esm",
    platform: "node",
    inject: [
      path.resolve(__dirname + "/../lib/shim-react.js"),
      path.resolve(__dirname + "/../lib/shim-fetch.js"),
    ],
    external: esbuildExternal,
    plugins: [
      mdx(buildOptions.mdxConfig),
      resolvePlugin({
        "react/jsx-runtime": "react/jsx-runtime.js",
      }),
    ],
  }).catch(() => process.exit(1))
}

export async function buildStaticPages(
  entryPoints: string[],
  tempRootFilePath: string,
  buildOptions: {
    outbase: string
    outdir: string
  },
  assetsTagStr?: string
) {
  const rootStaticContent = await buildRootEsmContent(tempRootFilePath)
  await Promise.all(
    entryPoints.map(async (entryPoint) => {
      const extname = path.extname(entryPoint)
      const basename = path.basename(entryPoint, extname)
      const dirname = path
        .dirname(entryPoint)
        .replace(buildOptions.outbase, buildOptions.outdir)
      const filename = path.join(dirname, basename + ".html")

      await buildStaticPage(
        entryPoint,
        filename,
        rootStaticContent,
        assetsTagStr
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
    const rootEsmContent: RootEsmContent = await import(tempRootFilePath)
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
  assetsTagStr?: string
) {
  const pageEsmContent: PageEsmContent = await import(path.resolve(entryPoint))
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
      frontmatter
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
      frontmatter
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
      frontmatter
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
          frontmatter
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
  assetsTagStr?: string,
  frontmatter?: {}
) {
  const RootComponent: any = rootStaticContent.component
  const globalStaticData = rootStaticContent.staticData
  const PageComponent: any = pageJsxContent
  const staticProps = staticDataItem.props

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
                  frontmatter={RootComponent !== Fragment && frontmatter}
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
          frontmatter={RootComponent !== Fragment && frontmatter}
        >
          {(() => {
            if (PageComponent === Fragment) {
              return <Fragment />
            } else {
              return (
                <PageComponent
                  {...globalStaticData?.props}
                  {...staticProps}
                  frontmatter={RootComponent !== Fragment && frontmatter}
                />
              )
            }
          })()}
        </RootComponent>
      )
    }
  }

  const html = await renderHtml(<RenderComponent />, assetsTagStr)

  await fs
    .outputFile(routePath, html)
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
    fileName: string
    outdir: string
    assetDir: string
  }
) {
  const customConfig = {
    build: {
      write: false,
      rollupOptions: {
        input: {
          __minista_auto_bundle_asset_pages: path.resolve(
            __dirname + "/../dist/pages.js"
          ),
        },
      },
    },
  }
  const mergedConfig = mergeConfig(viteConfig, customConfig)

  const result: any = await viteBuild(mergedConfig)
  const items = result.output

  if (Array.isArray(items) && items.length > 0) {
    items.map((item) => {
      if (item.fileName.match(/__minista_auto_bundle_asset_pages\.css/)) {
        const customFileName = `${buildOptions.outdir}/${buildOptions.fileName}.css`
        return item?.source && fs.outputFile(customFileName, item?.source)
      } else if (item.fileName.match(/__minista_auto_bundle_asset_pages\.js/)) {
        return
      } else {
        const customFileName =
          buildOptions.outdir + item.fileName.replace(buildOptions.assetDir, "")
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
    outbase: string
    outdir: string
  }
) {
  const assetsTags = entryPoints.map((entryPoint) => {
    const assetPath = entryPoint.replace(
      buildOptions.outbase,
      buildOptions.outdir
    )
    if (assetPath.endsWith(".css")) {
      return `<link rel="stylesheet" href="/${assetPath}">`
    } else if (assetPath.endsWith(".js")) {
      return `<script defer src="/${assetPath}"></script>`
    }
  })
  const assetsTagStr = assetsTags.join("")
  return assetsTagStr
}

export async function buildViteImporterRoots(config: MinistaConfig) {
  const outFile = config.tempViteImporterDir + "/roots.js"
  const rootFileDir = config.rootFileDir
  const rootFileName = config.rootFileName
  const rootFileExtStr = config.rootFileExt.join()
  const template = `export const getRoots = () => {
  const ROOTS = import.meta.globEager("/${rootFileDir}/${rootFileName}.{${rootFileExtStr}}")
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

export async function buildViteImporterRoutes(config: MinistaConfig) {
  const outFile = config.tempViteImporterDir + "/routes.js"
  const pagesDir = config.pagesDir
  const pagesExtStr = config.pagesExt.join()
  const pagesDirRegStr = config.pagesDir.replace(/\//g, "\\/")
  const replaceArray = config.pagesExt.map((ext) => {
    return `.replace(/\\/${pagesDirRegStr}|index|\\.${ext}$/g, "")`
  })
  const replaceArrayStr = replaceArray.join("\n      ")
  const template = `export const getRoutes = () => {
  const ROUTES = import.meta.globEager("/${pagesDir}/**/[a-z[]*.{${pagesExtStr}}")
  const routes = Object.keys(ROUTES).map((route) => {
    const routePath = route
      ${replaceArrayStr}
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

export async function buildViteImporterAssets(
  config: MinistaConfig,
  entry: { [key: string]: string }
) {
  const outFile = config.tempViteImporterDir + "/assets.js"
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
