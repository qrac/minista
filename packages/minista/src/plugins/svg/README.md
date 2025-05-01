# pluginSvg

ルートパスの SVG ファイルを HTML にインラインで展開するプラグイン。

- 展開時に SVGO でコードを最適化

## How To Use

```js
// ./minista.config.js
import { pluginSvg } from "minista"

export default {
  plugins: [pluginSvg()],
}
```

```jsx
// ./src/pages/index.jsx
import { Svg } from "minista/client"

export default function () {
  return <Svg src="/src/assets/square.svg" />
}
```

## Options

```js
// ./minista.config.js (with default options)
import { pluginSvg } from "minista"

export default {
  plugins: [pluginSvg({})],
}
```

### svgo

- 型: `Config`
- デフォルト: `undefined`

[svgo](https://www.npmjs.com/package/svgo) の Config を渡して最適化処理の内容を変更できます。

## Svg

ルートパスの SVG ファイルを読み込んで `<svg>` タグに展開するコンポーネント。

- 展開時に SVGO でコードを最適化

```jsx
// ./src/pages/index.jsx
import { Svg } from "minista/client"

export default function () {
  return <Svg src="/src/assets/square.svg" />
}
```

```ts
type SvgProps = {
  src: string
  className?: string
  title?: string
  attributes?: React.SVGProps<SVGSVGElement>
} & React.SVGProps<SVGSVGElement>
```
