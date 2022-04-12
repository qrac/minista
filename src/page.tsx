import { useState, useEffect, Fragment } from "react"
import { useMatch } from "react-router-dom"

import type {
  MinistaLocation,
  GlobalStaticData,
  GetGlobalStaticData,
  StaticDataList,
  StaticDataCache,
  GetStaticData,
} from "./types.js"

import { valueToStringObject, sortObject } from "./utils"

export type PageProps = {
  routePath: string
  RootComponent: any
  getGlobalStaticData?: GetGlobalStaticData
  PageComponent: any
  getStaticData?: GetStaticData
  frontmatter?: any
}

export const Page = ({
  routePath,
  RootComponent,
  getGlobalStaticData,
  PageComponent,
  getStaticData,
  frontmatter,
}: PageProps) => {
  const match = useMatch(routePath)

  const defaultGlobalStaticData = { props: {} }
  const defaultStaticDataItem = { props: {}, paths: {} }

  const [globalStaticData, setGlobalStaticData] = useState<GlobalStaticData>({
    props: {},
  })
  const [staticProps, setStaticProps] = useState({})
  const [staticDataList, setStaticDataList] = useState<StaticDataList>([
    defaultStaticDataItem,
  ])
  const [staticDataCache, setStaticDataCache] = useState<StaticDataCache>({})

  const staticLocation: MinistaLocation = { pathname: location.pathname }

  useEffect(() => {
    const data = async () => {
      if (!getGlobalStaticData) {
        setGlobalStaticData(defaultGlobalStaticData)
        return
      } else {
        const response = await getGlobalStaticData()
        setGlobalStaticData({ ...defaultGlobalStaticData, ...response })
      }
    }
    data()
  }, [getGlobalStaticData])

  useEffect(() => {
    const data = async () => {
      if (!getStaticData) {
        setStaticDataList([defaultStaticDataItem])
        if (routePath in staticDataCache) {
          // @ts-ignore
          delete staticDataCache[routePath]
        }
        return
      }

      if (routePath in staticDataCache) {
        // @ts-ignore
        setStaticDataList(staticDataCache[routePath])
        return
      }

      const response = await getStaticData()

      if (Array.isArray(response) && response.length > 0) {
        const list = response.map((item) => {
          return { ...defaultStaticDataItem, ...item }
        })
        setStaticDataList(list)
        setStaticDataCache({ ...staticDataCache, [routePath]: list })
        return
      } else {
        const staticDataItem = { ...defaultStaticDataItem, ...response }
        setStaticDataList([staticDataItem])
        setStaticDataCache({
          ...staticDataCache,
          [routePath]: [staticDataItem],
        })
        return
      }
    }
    data()
  }, [routePath])

  useEffect(() => {
    if (staticDataList.length === 1) {
      return setStaticProps((staticDataList[0].props ??= {}))
    } else {
      const targetItem = staticDataList.find((item) => {
        const strPaths = valueToStringObject(item.paths)
        const strParams = valueToStringObject(match?.params)
        const sortedPaths = sortObject(strPaths)
        const sortedParams = sortObject(strParams)
        const jsonPaths = JSON.stringify(sortedPaths)
        const jsonParams = JSON.stringify(sortedParams)
        return jsonPaths === jsonParams
      })
      return targetItem && setStaticProps((targetItem.props ??= {}))
    }
  }, [staticDataList])

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
                location={staticLocation}
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
        location={staticLocation}
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
                location={staticLocation}
              />
            )
          }
        })()}
      </RootComponent>
    )
  }
}
