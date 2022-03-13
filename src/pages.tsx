import { Fragment } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"

import { Page } from "./page.js"

export const Pages = () => {
  const ROOTS = import.meta.globEager("/src/root.{jsx,tsx}")
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

  const ROUTES = import.meta.globEager("/src/pages/**/[a-z[]*.{jsx,tsx,md,mdx}")
  const routes = Object.keys(ROUTES).map((route) => {
    const routePath = route
      .replace(/\/src\/pages|index|\.js$/g, "")
      .replace(/\/src\/pages|index|\.jsx$/g, "")
      .replace(/\/src\/pages|index|\.ts$/g, "")
      .replace(/\/src\/pages|index|\.tsx$/g, "")
      .replace(/\/src\/pages|index|\.md$/g, "")
      .replace(/\/src\/pages|index|\.mdx$/g, "")
      .replace(/\[\.{3}.+\]/, "*")
      .replace(/\[(.+)\]/, ":$1")
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
