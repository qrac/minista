import { compilePageFetch } from "../compile/fetch.js"

export type Pages = {
  path: string
  component: new () => React.Component<any, any>
  getStaticData?: PageFetch
  frontmatter?: {}
}[]

type ImportedPages = {
  [key: string]: {
    default: new () => React.Component<any, any>
    getStaticData?: PageFetch
    frontmatter?: {}
  }
}

export type PageFetch = () => Promise<PageStaticData>
type PageStaticData = PageStaticDataList | PageStaticDataItem | undefined
type PageStaticDataList = PageStaticDataItem[]
type PageStaticDataItem = {
  props?: {}
  paths?: {}
}

export type ResolvedPages = {
  path: string
  staticData: {
    props: {}
    paths: {}
  }
  component: new () => React.Component<any, any, any>
  frontmatter?: {}
}[]

export function getPages(): Pages {
  const PAGES: ImportedPages = import.meta.glob(
    ["/src/pages/**/*.{tsx,jsx,mdx,md}", "!/src/pages/_global.{tsx,jsx}"],
    {
      eager: true,
    }
  )
  const pages: Pages = Object.keys(PAGES).map((page) => {
    const pagePath = page
      .replace(/^\/src\/pages\//g, "/")
      .replace(/\index|\.tsx$/g, "")
      .replace(/\index|\.jsx$/g, "")
      .replace(/\index|\.mdx$/g, "")
      .replace(/\index|\.md$/g, "")
      .replace(/\[\.{3}.+\]/, "*")
      .replace(/\[(.+)\]/, ":$1")
      .replace(/^.\//, "/")
    return {
      path: pagePath,
      component: PAGES[page].default,
      getStaticData: PAGES[page].getStaticData,
      frontmatter: PAGES[page].frontmatter,
    }
  })
  return pages
}

export async function getPageStaticData(getStaticData: PageFetch) {
  const compiledPageFetch = await compilePageFetch(getStaticData)
  return await compiledPageFetch()
}

export async function resolvePages(pages: Pages): Promise<ResolvedPages> {
  const resolvedPages = await Promise.all(
    pages.map(async (page) => {
      const defaultStaticData = { props: {}, paths: {} }
      const staticData = page.getStaticData
        ? await getPageStaticData(page.getStaticData)
        : undefined

      if (!staticData) {
        return {
          path: page.path,
          staticData: defaultStaticData,
          component: page.component,
          frontmatter: page.frontmatter,
        }
      }

      if ("props" in staticData && "paths" in staticData === false) {
        const mergedStaticData = { ...defaultStaticData, ...staticData }
        return {
          path: page.path,
          staticData: mergedStaticData,
          component: page.component,
          frontmatter: page.frontmatter,
        }
      }

      if ("paths" in staticData) {
        const mergedStaticData = { ...defaultStaticData, ...staticData }

        let fixedPath = page.path

        for await (const [key, value] of Object.entries(
          mergedStaticData.paths
        )) {
          const reg = new RegExp(":" + key, "g")
          fixedPath = fixedPath.replace(reg, `${value}`)
        }
        return {
          path: fixedPath,
          staticData: mergedStaticData,
          component: page.component,
          frontmatter: page.frontmatter,
        }
      }

      if (Array.isArray(staticData) && staticData.length > 0) {
        const entryPoints = staticData

        return await Promise.all(
          entryPoints.map(async (entryPoint) => {
            const mergedStaticData = { ...defaultStaticData, ...entryPoint }

            let fixedPath = page.path

            for await (const [key, value] of Object.entries(
              mergedStaticData.paths
            )) {
              const reg = new RegExp(":" + key, "g")
              fixedPath = fixedPath.replace(reg, `${value}`)
            }

            return {
              path: fixedPath,
              staticData: mergedStaticData,
              component: page.component,
              frontmatter: page.frontmatter,
            }
          })
        )
      }

      return {
        path: page.path,
        staticData: defaultStaticData,
        component: page.component,
        frontmatter: page.frontmatter,
      }
    })
  )
  return resolvedPages.flat()
}
