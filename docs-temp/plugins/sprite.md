# pluginSprite

ルートパスの SVG ファイルをスプライト化して出力するプラグイン。

- スプライト生成時に SVGO でコードを最適化

## Table of Contents

contents list

## How To Use

```js
// ./minista.config.js
import { pluginSprite } from "minista"

export default {
  plugins: [pluginSprite()],
}
```

```jsx
// ./src/pages/index.jsx
import { Sprite } from "minista/assets"

export default function () {
  return <Sprite src="/src/assets/sprite/square.svg" />
}
```

## Options

```js
// Default
pluginSprite({})
```

### config

- 型: `Config`
- デフォルト: `undefined`

[svgo](https://www.npmjs.com/package/svgo) の Config を渡して最適化処理の内容を変更できます。

## Sprite

ルートパスの SVG ファイルを読み込んで `<svg>` タグに展開するコンポーネント。

- スプライト生成時に SVGO でコードを最適化

```jsx
// ./src/pages/index.jsx
import { Sprite } from "minista/assets"

export default function () {
  return <Sprite src="/src/assets/sprite/square.svg" />
}
```

```xml
<!-- dist -->
<svg><use href="/assets/sprite.svg#square"></use>
```

```ts
export type SpriteProps = {
  src: string
  symbolId?: string
  className?: string
  title?: string
  attributes?: React.SVGProps<SVGSVGElement>
} & React.SVGProps<SVGSVGElement>
```

### src

`src` のファイル名が `symbolId` になり、ディレクトリ名が出力される SVG スプライトのファイル名になります。

```
src: "/src/assets/sprite/square.svg"
=> sprite.svg#square
```

対象となったディレクトリ内の SVG ファイルは 1 つの SVG スプライトファイルとしてまとめられ、ビルドパイプラインに乗せられます。

SVG スプライトファイル内の `symbol` は `symbolId` 順に並べ替えられ、重複した `symbolId` が存在する場合は後から読み込まれたもので上書きされます。

### symbolId

スプライト対象ディレクトリ内には既存の SVG スプライトファイルを混ぜることもできます。その場合、SVG スプライトのファイル名は `symbolId` にならないため、既存の SVG スプライトファイル内の `symbol` を使う場合はコンポーネントに `symbolId` を設定します。

```tsx
// ./src/pages/index.jsx
import { Sprite } from "minista/assets"

export default function () {
  return (
    <Sprite
      src="/src/assets/sprite/common-sprite.svg"
      symbolId="common-square"
    />
  )
}
```
