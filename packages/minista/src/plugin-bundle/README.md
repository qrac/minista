# pluginBundle

## About

- CSS・JS・画像をビルドプロセスに乗せる
- import した CSS を結合して出力
- import した画像を出力

## How To Use

```js
// ./minista.config.js
import { pluginBundle } from "minista"

export default {
  plugins: [pluginBundle()],
}
```

```jsx
// ./src/pages/index.jsx
import { Head } from "minista/client"

export default function () {
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/src/assets/style.css" />
        <script type="module" src="/src/assets/script.ts" />
      </Head>
      <div>
        <img src="/src/assets/image.png" width={76} height={76} />
      </div>
    </>
  )
}
```

## Options

| Option    | Type       | Detail                                                          |
| --------- | ---------- | --------------------------------------------------------------- |
| `src`     | `string[]` | アセットを検出するテンプレートを Vite の `fast-glob` 形式で指定 |
| `outName` | `string`   | import した CSS を結合出力する場合のファイル名                  |

```js
// ./minista.config.js (with default options)
import { pluginBundle } from "minista"

export default {
  plugins: [
    pluginBundle({
      src: [
        "/src/layouts/index.{tsx,jsx}",
        "/src/pages/**/*.{tsx,jsx}",
        "!/src/pages/**/*.mpa.{tsx,jsx}",
        "!/src/pages/**/*.enhance.{tsx,jsx}",
        "!/src/pages/**/*.stories.{tsx,jsx}",
      ],
      outName: "bundle",
    }),
  ],
}
```
