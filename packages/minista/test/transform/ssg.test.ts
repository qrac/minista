import { describe, expect, it } from "vitest"
import beautify from "js-beautify"

import { transformSsg } from "../../src/transform/ssg"
import { resolveConfig } from "../../src/config"
import global from "../_data/global"
import page from "../_data/page"

const Global = global as unknown as new () => React.Component<any, any, any>
const Page = page as unknown as new () => React.Component<any, any, any>

describe("transformSsg", () => {
  it("Default", async () => {
    const config = await resolveConfig({})

    let result = await transformSsg({
      command: "build",
      resolvedGlobal: {
        staticData: { props: {} },
        metadata: {},
      },
      resolvedPages: [
        {
          path: "/",
          component: Page,
          staticData: { props: {}, paths: {} },
          metadata: {},
          frontmatter: {},
        },
      ],
      config,
    })

    result = result.map((page) => {
      return {
        fileName: page.fileName,
        path: page.path,
        group: page.group,
        title: page.title,
        draft: page.draft,
        html: beautify.html(page.html, config.main.beautify.htmlOptions),
      }
    })
    expect(result[0].html).toEqual(`<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title></title>
    <link rel="stylesheet" href="/assets/bundle.css" data-minista-flag-entried data-minista-flag-bundle>
    <script type="module" src="/assets/hydrate.js" data-minista-flag-entried data-minista-flag-hydrate></script>
  </head>
  <body>
    <h1>index</h1>
  </body>
</html>`)
  })

  it("with global", async () => {
    const config = await resolveConfig({})

    let result = await transformSsg({
      command: "build",
      resolvedGlobal: {
        component: Global,
        staticData: { props: {} },
        metadata: {},
      },
      resolvedPages: [
        {
          path: "/",
          component: Page,
          staticData: { props: {}, paths: {} },
          metadata: {},
          frontmatter: {},
        },
      ],
      config,
    })

    result = result.map((page) => {
      return {
        fileName: page.fileName,
        path: page.path,
        group: page.group,
        title: page.title,
        draft: page.draft,
        html: beautify.html(page.html, config.main.beautify.htmlOptions),
      }
    })
    expect(result[0].html).toEqual(`<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title></title>
    <link rel="stylesheet" href="/assets/bundle.css" data-minista-flag-entried data-minista-flag-bundle>
    <script type="module" src="/assets/hydrate.js" data-minista-flag-entried data-minista-flag-hydrate></script>
  </head>
  <body>
    <div>
      <h1>index</h1>
    </div>
  </body>
</html>`)
  })
})
