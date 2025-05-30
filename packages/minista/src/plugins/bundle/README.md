# pluginBundle

ルートパスの CSS・JavaScript・画像をビルドプロセスに乗せるプラグイン。

- ファイルはプロジェクトの root から [tinyglobby](https://www.npmjs.com/package/tinyglobby) の glob で検索
- テンプレート内で import した CSS を結合して出力
- テンプレート内で import した画像を出力

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
import { Head } from "minista/head"

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

```js
// Default
pluginBundle({
  src: ["/src/layouts/index.{tsx,jsx}", "/src/pages/**/*.{tsx,jsx,mdx}"],
  outName: "bundle",
})
```

### src

- 型: `string[]`
- デフォルト: `["/src/layouts/index.{tsx,jsx}", "/src/pages/**/*.{tsx,jsx,mdx}"]`

import している CSS・画像を検出するテンプレートを glob 形式で指定します。対象ファイルは Vite の機能で glob import されます。

### outName

- 型: `string`
- デフォルト: `"bundle"`

import した CSS を結合出力する場合のファイル名（拡張子なし）。
