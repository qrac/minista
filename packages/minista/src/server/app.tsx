import { Route, Routes } from "react-router-dom"

import type { ResolvedGlobal } from "./global"
import type { ResolvedPages } from "./pages"

export function App({
  resolvedGlobal,
  resolvedPages,
}: {
  resolvedGlobal: ResolvedGlobal
  resolvedPages: ResolvedPages
}) {
  const global = resolvedGlobal
  const routes = resolvedPages
  return (
    <>
      <Routes>
        {routes.map((page) => {
          const location = { pathname: page.path }

          if (global.component) {
            const GlobalComponent = global.component
            const PageComponent = page.component
            return (
              <Route
                key={page.path}
                path={page.path}
                element={
                  <GlobalComponent
                    {...global.staticData.props}
                    {...page.staticData.props}
                    frontmatter={page.frontmatter}
                    location={location}
                  >
                    <PageComponent
                      {...global.staticData.props}
                      {...page.staticData.props}
                      frontmatter={page.frontmatter}
                      location={location}
                    />
                  </GlobalComponent>
                }
              ></Route>
            )
          } else {
            const PageComponent = page.component
            return (
              <Route
                key={page.path}
                path={page.path}
                element={
                  <PageComponent
                    {...global.staticData.props}
                    {...page.staticData.props}
                    frontmatter={page.frontmatter}
                    location={location}
                  />
                }
              ></Route>
            )
          }
        })}
      </Routes>
    </>
  )
}
