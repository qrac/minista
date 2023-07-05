import type {
  GetStaticData,
  StaticData,
  PageProps,
  Metadata,
  Frontmatter,
} from "../shared/index.js"

type PageComponent = () => React.CElement<
  { [key: string]: any },
  React.Component<PageProps, {}, any>
>

type ImportedPages = {
  [key: string]: {
    default: PageComponent
    getStaticData?: GetStaticData
    metadata?: Metadata
    frontmatter?: Frontmatter
  }
}

type Page = {
  path: string
  component: PageComponent
  getStaticData?: GetStaticData
  metadata: Metadata
  frontmatter: Frontmatter
}

export type ResolvedPages = {
  path: string
  component: PageComponent
  staticData: StaticData
  metadata: Metadata
  frontmatter: Frontmatter
}[]

export function getPages(): Page[] {
  const PAGES: ImportedPages = import.meta.glob(
    [
      "/src/pages/**/*.{tsx,jsx,mdx,md}",
      "!/src/pages/_global.{tsx,jsx}",
      "!/src/pages/**/*.stories.{js,jsx,ts,tsx,md,mdx}",
    ],
    {
      eager: true,
    }
  )
  const pages: Page[] = Object.keys(PAGES).map((page) => {
    const pagePath = page
      .replace(/^\/src\/pages\//g, "/")
      .replace(/\index|\.tsx$/g, "")
      .replace(/\index|\.jsx$/g, "")
      .replace(/\index|\.mdx$/g, "")
      .replace(/\index|\.md$/g, "")
      .replace(/\[\.{3}.+\]/, "*")
      .replace(/\[(.+)\]/, ":$1")
      .replace(/^.\//, "/")
    const frontmatter = PAGES[page].frontmatter || {}
    const metadata = {
      ...frontmatter,
      ...(PAGES[page].metadata || {}),
    }
    return {
      path: pagePath,
      component: PAGES[page].default,
      getStaticData: PAGES[page].getStaticData,
      metadata,
      frontmatter,
    }
  })
  return pages
}

export async function resolvePages(pages: Page[]): Promise<ResolvedPages> {
  const resolvedPages = await Promise.all(
    pages.map(async (page) => {
      const defaultStaticData = { props: {}, paths: {} }
      const staticData = page.getStaticData
        ? await page.getStaticData()
        : undefined

      if (!staticData) {
        return {
          path: page.path,
          component: page.component,
          staticData: defaultStaticData,
          metadata: page.metadata,
          frontmatter: page.frontmatter,
        }
      }

      if ("props" in staticData && "paths" in staticData === false) {
        const mergedStaticData = { ...defaultStaticData, ...staticData }
        return {
          path: page.path,
          component: page.component,
          staticData: mergedStaticData,
          metadata: page.metadata,
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
          component: page.component,
          staticData: mergedStaticData,
          metadata: page.metadata,
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
              component: page.component,
              staticData: mergedStaticData,
              metadata: page.metadata,
              frontmatter: page.frontmatter,
            }
          })
        )
      }

      return {
        path: page.path,
        component: page.component,
        staticData: defaultStaticData,
        metadata: page.metadata,
        frontmatter: page.frontmatter,
      }
    })
  )
  return resolvedPages.flat()
}
