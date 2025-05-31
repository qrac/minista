# pluginBundle

JSX 内で import した CSS・画像を出力するプラグイン。

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
import "../assets/image.css"
import iconUrl from "../assets/image.png"

export default function () {
  return <img src={iconUrl} alt="icon" width={76} height={76} />
}
```

## Options

```js
// Default
pluginBundle({
  useExportCss: true,
  src: ["/src/layouts/index.{tsx,jsx}", "/src/pages/**/*.{tsx,jsx,mdx}"],
  outName: "bundle",
})
```

### useExportCss

- 型: `boolean`
- デフォルト: `true`

import した CSS を結合出力します。

### src

- 型: `string[]`
- デフォルト: `["/src/layouts/index.{tsx,jsx}", "/src/pages/**/*.{tsx,jsx,mdx}"]`

CSS・画像を検出するテンプレートを glob 形式で指定します。対象ファイルは Vite の機能で glob import されます。

### outName

- 型: `string`
- デフォルト: `"bundle"`

import した CSS を結合出力する場合のファイル名（拡張子なし）。
