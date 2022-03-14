import { useState, useEffect, Fragment } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"

import { Page } from "./page.js"

export const Pages = () => {
  const [roots, setRoots] = useState([
    { RootComponent: Fragment, getGlobalStaticData: undefined },
  ])
  const [routes, setRoutes] = useState([])

  useEffect(() => {
    const data = async () => {
      const { getRoots } = await import(
        //@ts-ignore
        "/@minista-temp/vite-importer/roots.js"
      )
      const { getRoutes } = await import(
        //@ts-ignore
        "/@minista-temp/vite-importer/routes.js"
      )
      try {
        const { getAssets } = await import(
          //@ts-ignore
          "/@minista-temp/vite-importer/assets.js"
        )
        getAssets()
      } catch (err) {
        //console.log(err)
      }

      setRoots(getRoots)
      setRoutes(getRoutes)
    }
    data()
  }, [])
  return (
    <Fragment>
      {routes.length > 0 && (
        <BrowserRouter>
          <Routes>
            {routes?.map(
              ({
                routePath,
                PageComponent = Fragment,
                getStaticData,
                frontmatter,
              }) => {
                return (
                  <Route
                    key={routePath}
                    path={routePath}
                    element={
                      <Page
                        routePath={routePath}
                        RootComponent={roots[0].RootComponent}
                        getGlobalStaticData={roots[0].getGlobalStaticData}
                        PageComponent={PageComponent}
                        getStaticData={getStaticData}
                        frontmatter={frontmatter}
                      />
                    }
                  />
                )
              }
            )}
          </Routes>
        </BrowserRouter>
      )}
    </Fragment>
  )
}
