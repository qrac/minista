import { describe, expect, it } from "vitest"
import beautify from "js-beautify"

import { transformPage } from "../../src/transform/page"
import { resolveConfig } from "../../src/config"
import global from "../_data/global"
import page from "../_data/page"

const Global = global as unknown as new () => React.Component<any, any, any>
const Page = page as unknown as new () => React.Component<any, any, any>

describe("transformPage", () => {
  it("Default", async () => {
    const config = await resolveConfig({})

    let result = transformPage({
      url: "/",
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
    })
    result = beautify.html(result, config.main.beautify.htmlOptions)

    //console.log(result)
    expect(result).toEqual(`<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
  </head>
  <body>
    <h1>index</h1>
  </body>
</html>`)
  })

  it("with global", async () => {
    const config = await resolveConfig({})

    let result = transformPage({
      url: "/",
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
    })
    result = beautify.html(result, config.main.beautify.htmlOptions)

    //console.log(result)
    expect(result).toEqual(`<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
  </head>
  <body>
    <div>
      <h1>index</h1>
    </div>
  </body>
</html>`)
  })
})
