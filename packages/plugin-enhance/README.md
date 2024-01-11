# minista-plugin-enhance

## About

[minista](https://minista.qranoko.jp) および [Vite](https://ja.vitejs.dev/) で動作するプラグイン。

任意の `*.tsx` `*.jsx` ファイルで既存の HTML を改修し、静的な HTML を書き出します。

## How To Use

```sh
$ npm install minista-plugin-enhance
```

```js
// ./minista.config.js or vite.config.js
import { pluginEnhance } from "minista-plugin-enhance"

export default {
  plugins: [pluginEnhance()],
}
```

## Options

| Option     | Type       | Detail                                              |
| ---------- | ---------- | --------------------------------------------------- |
| `src`      | `string[]` | ページテンプレートを Vite の `fast-glob` 形式で指定 |
| `srcBases` | `string[]` | ページテンプレートを URL に変換する際に省くパス     |

```js
// ./minista.config.js (with default options)
import { pluginSsg } from "minista-plugin-ssg"

export default {
  plugins: [
    pluginSsg({
      src: ["/src/enhance/**/*.{tsx,jsx}", "/src/pages/**/*.enhance.{tsx,jsx}"],
      srcBases: ["/src/enhance", "/src/pages"],
    }),
  ],
}
```

## Template

プラグインの `src` で指定した `*.tsx` `*.jsx` ファイルで `html, commands` を `export default` します。

```tsx
// Example
import type { EnhancePage } from "minista-plugin-enhance/client"

import html from "./index.html?raw"

function ComponentBox() {
  return (
    <div className="box">
      <p>component text</p>
    </div>
  )
}

function ComponentList() {
  return (
    <ul>
      <li>component item</li>
      <li>component item</li>
    </ul>
  )
}

export default function (): EnhancePage {
  return {
    html,
    commands: [
      {
        selector: "html",
        attr: "lang",
        value: "ja",
      },
      {
        selector: "title",
        value: "日本語タイトル",
      },
      {
        selector: `link[href="/css/style1.css"]`,
        attr: "data-css",
        value: undefined,
      },
      {
        selector: `link[href="/css/style2.css"]`,
        method: "remove",
      },
      {
        selectorAll: "script",
        attr: "src",
        pattern: /^\/(.*?)/,
        value: "https://example.com/$1",
      },
      {
        selector: "section#content1 > div",
        html: `<div class="box"><p>html text</p></div>`,
      },
      {
        selectorAll: "section#content2 > ul",
        method: "insert",
        position: "before",
        html: `<h3>List</h3>`,
      },
      {
        selector: "section#content3 > div",
        component: ComponentBox,
      },
      {
        selectorAll: "section#content4 > h3",
        method: "insert",
        position: "after",
        component: ComponentList,
      },
      {
        selector: "section#content5 > div",
        method: "insert",
        position: "start",
        html: `<p>start text</p>`,
      },
      {
        selector: "section#content5 > div",
        method: "insert",
        position: "end",
        html: `<p>end text</p>`,
      },
    ],
  }
}
```

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
