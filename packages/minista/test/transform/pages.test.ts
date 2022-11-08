import { describe, expect, it } from "vitest"
import beautify from "js-beautify"

import { transformPages } from "../../src/transform/pages"
import { resolveConfig } from "../../src/config"
import global from "../_data/global"
import page from "../_data/page"

const Global = global as unknown as new () => React.Component<any, any, any>
const Page = page as unknown as new () => React.Component<any, any, any>

describe("transformPages", () => {
  it("Default", async () => {
    const config = await resolveConfig({})

    let result = await transformPages({
      resolvedGlobal: {
        staticData: { props: {} },
      },
      resolvedPages: [
        {
          path: "/",
          staticData: { props: {}, paths: {} },
          component: Page,
        },
      ],
      config,
    })

    result = result.map((page) => {
      return {
        fileName: page.fileName,
        path: page.path,
        title: page.title,
        html: beautify.html(page.html, config.main.beautify.htmlOptions),
      }
    })

    //console.log(result)
    expect(result[0].html).toEqual(`<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
    <link rel="stylesheet" data-minista-build-bundle-href="/assets/bundle.css">
    <script type="module" data-minista-build-partial-src="/assets/partial.js"></script>
  </head>
  <body>
    <h1>index</h1>
  </body>
</html>`)
  })

  it("with global", async () => {
    const config = await resolveConfig({})

    let result = await transformPages({
      resolvedGlobal: {
        staticData: { props: {} },
        component: Global,
      },
      resolvedPages: [
        {
          path: "/",
          staticData: { props: {}, paths: {} },
          component: Page,
        },
      ],
      config,
    })

    result = result.map((page) => {
      return {
        fileName: page.fileName,
        path: page.path,
        title: page.title,
        html: beautify.html(page.html, config.main.beautify.htmlOptions),
      }
    })

    //console.log(result)
    expect(result[0].html).toEqual(`<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
    <link rel="stylesheet" data-minista-build-bundle-href="/assets/bundle.css">
    <script type="module" data-minista-build-partial-src="/assets/partial.js"></script>
  </head>
  <body>
    <div>
      <h1>index</h1>
    </div>
  </body>
</html>`)
  })
})
