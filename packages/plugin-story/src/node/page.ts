import type { FormatedPage, ResolvedPage } from "../@types/node.js"

export async function resolvePages(
  pages: FormatedPage[]
): Promise<ResolvedPage[]> {
  const pageArray = await Promise.all(
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
        }
      }

      if ("props" in staticData && "paths" in staticData === false) {
        const mergedStaticData = { ...defaultStaticData, ...staticData }
        return {
          path: page.path,
          component: page.component,
          staticData: mergedStaticData,
          metadata: page.metadata,
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
            }
          })
        )
      }
      return {
        path: page.path,
        component: page.component,
        staticData: defaultStaticData,
        metadata: page.metadata,
      }
    })
  )
  return pageArray.flat()
}
