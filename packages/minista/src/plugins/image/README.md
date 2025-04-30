# pluginImage

画像を最適化し、リモート画像をダウンロードするプラグイン。

## How To Use

```js
// ./minista.config.js
import { pluginImage } from "minista"

export default {
  plugins: [pluginImage()],
}
```

```jsx
// ./src/pages/index.jsx
import { Image } from "minista/client"

export default function () {
  return <Image src="/src/assets/image.png" />
}
```

## Options

```js
// ./minista.config.js (with default options)
import { pluginImage } from "minista"

export default {
  plugins: [
    pluginImage({
      useCache: true,
      optimize: {
        outName: "[name]-[width]x[height]",
        remoteName: "remote-[index]",
        layout: "constrained",
        breakpoints: [
          320, 400, 640, 800, 1024, 1280, 1440, 1920, 2560, 2880, 3840,
        ],
        resolutions: [1, 2],
        aspect: undefined,
        format: "inherit",
        formatOptions: {},
        quality: undefined,
        fit: "cover",
        position: "centre",
        background: undefined,
      },
      decoding: "async",
      loading: "eager",
    }),
  ],
}
```

### useCache

- 型: `boolean`
- デフォルト: `true`

開発・ビルド中にキャッシュを利用します。

### optimize.outName

- 型: `string`
- デフォルト: `[name]-[width]x[height]`

出力画像のファイル名。拡張子は含みません。以下の動的出力タグを使用できます。

- `[name]`: 元ファイルの名前
- `[width]`: 出力ファイルの幅
- `[height]`: 出力ファイルの高さ

### optimize.remoteName

- 型: `string`
- デフォルト: `remote-[index]`

リモート画像をダウンロードした際の名前。拡張子は含みません。`outName` の `[name]` として利用されます。以下の動的出力タグを使用できます。

- `[index]`: ダウンロードされた順番（開始: 1）

### optimize.layout

- 型: `"constrained" | "fixed"`
- デフォルト: `"constrained"`

出力画像のレイアウト方法。選択肢によって採用される出力パターンが決まります。

- `"constrained"`: コンテナサイズ（`breakpoint` を採用）
- `"fixed"`: 固定サイズ（`resolutions` を採用）

### optimize.breakpoints

- 型: `number[] | { count: number; minWidth: number; maxWidth: number }`
- デフォルト: `[320, 400, 640, 800, 1024, 1280, 1440, 1920, 2560, 2880, 3840]`

出力画像のレスポンシブ幅。数値配列で明示するか、範囲 `minWidth`〜`maxWidth` と生成数 `count` で指定できます。

### optimize.resolutions

- 型: `number[]`
- デフォルト: `[1, 2]`

出力画像の解像度。デフォルトでは通常用 + 2 倍サイズ用。

### optimize.format

- 型: `"inherit" | "jpg" | "png" | "webp" | "avif"`
- デフォルト: `"inherit"`

出力画像のフォーマット。`"inherit"` を指定すると元画像と同じフォーマットになります。

### optimize.formatOptions

- 型: `{ jpg?: JpegOptions, png?: PngOptions, webp?: WebpOptions, avif?: AvifOptions }`
- デフォルト: `{}`

フォーマットごとの圧縮オプション。 [sharp](https://www.npmjs.com/package/sharp) の各種オプションが利用できます。

### optimize.quality

- 型: `number`
- デフォルト: `undefined`

出力画像の品質。フォーマットごとに個別設定する場合は `formatOptions` をお使いください。

### optimize.aspect

- 型: `string`
- デフォルト: `undefined`

出力画像のアスペクト比。`"16:9"` などを指定すると、その比率でリサイズされます。

### optimize.fit

- 型: `ResizeOptions["fit"]`
- デフォルト: `"cover"`

[sharp](https://www.npmjs.com/package/sharp) の Resize にフィット方法を指定します。

- 例: `"cover"`, `"contain"`, `"fill"`, `"inside"`, `"outside"`

### optimize.position

- 型: `ResizeOptions["position"]`
- デフォルト: `"centre"`

[sharp](https://www.npmjs.com/package/sharp) の Resize にトリミングやリサイズ時の重心位置を指定します。

- 例: `"centre"`, `"top"`, `"left"`, `"right"`, `"bottom"`

### optimize.background

- 型: `ResizeOptions["background"]`
- デフォルト: `undefined`

[sharp](https://www.npmjs.com/package/sharp) の Resize に背景色を指定します。主に `fit` が `"contain"` の場合に有効となります。

- 例: `"#ffffff"`, `{r: 255, g: 255, b: 255, alpha: 0.5}`

### decoding

- 型: `HTMLImageElement["decoding"]`
- デフォルト: `async`

生成される `<img>` タグに一括で `decoding` 属性を付与します。

- `"async"`: 非同期デコード
- `"sync"`: 同期デコード
- `"auto"`: ブラウザに任せる

### loading

- 型: `HTMLImageElement["loading"]`
- デフォルト: `eager`

生成される `<img>` タグに一括で `loading` 属性を付与します。

- `"eager"`: ページロード時に即座に読み込み
- `"lazy"`: ビューポートに入るまで遅延読み込み

## Image

シンプルな `<img>` タグで画像の最適化を行うコンポーネント。

- 元画像 1 枚・出力フォーマット 1 種類にのみ対応
- 自動で画像の幅と高さを取得して `width` `height` を付与
- リモート画像をダウンロード

```tsx
// ./src/pages/index.jsx
import { Image } from "minista/client"

export default function () {
  return <Image src="/src/assets/image.png" />
}
```

```html
<!-- dist -->
<img
  srcset="
    /assets/images/image-320x157.png    320w,
    /assets/images/image-400x196.png    400w,
    /assets/images/image-640x314.png    640w,
    /assets/images/image-800x392.png    800w,
    /assets/images/image-1024x502.png  1024w,
    /assets/images/image-1280x627.png  1280w,
    /assets/images/image-1440x706.png  1440w,
    /assets/images/image-1920x941.png  1920w,
    /assets/images/image-2208x1080.png 2208w
  "
  src="/assets/images/image-2208x1080.png"
  sizes="(min-width: 2208px) 2208px, 100vw"
  width="2208"
  height="1080"
  alt=""
  decoding="async"
  loading="eager"
/>
```

### ImageProps

`<Image>` コンポーネントには、プラグインオプション `optimize` を含めた props を個別に渡してオーバーライドできます。

```ts
type ImageProps = {
  src: string
  sizes?: string
  width?: number | string
  height?: number | string
  alt?: string
  decoding?: HTMLImageElement["decoding"]
  loading?: HTMLImageElement["loading"]
} & Partial<ImageOptimize> &
  React.HTMLAttributes<HTMLImageElement>
```

## Picture

`<picture>` に `<source>` `<img>` タグを内包する詳細な画像最適化が行えるコンポーネント。

- 画面幅によって元画像を変更するアートディレクティブに対応
- 出力フォーマットを複数設定してフォールバック可能
- 自動で画像の幅と高さを取得して `width` `height` を付与
- リモート画像をダウンロード

```tsx
// ./src/pages/index.jsx
import { Picture } from "minista/client"

export default function () {
  return <Picture src="/src/assets/image.png" formats={["webp", "inherit"]} />
}
```

```html
<!-- dist -->
<picture>
  <source
    srcset="
      /assets/images/image-320x157.webp    320w,
      /assets/images/image-400x196.webp    400w,
      /assets/images/image-640x314.webp    640w,
      /assets/images/image-800x392.webp    800w,
      /assets/images/image-1024x502.webp  1024w,
      /assets/images/image-1280x627.webp  1280w,
      /assets/images/image-1440x706.webp  1440w,
      /assets/images/image-1920x941.webp  1920w,
      /assets/images/image-2208x1080.webp 2208w
    "
    sizes="(min-width: 2208px) 2208px, 100vw"
    width="2208"
    height="1080"
    type="image/webp"
  />
  <img
    srcset="
      /assets/images/image-320x157.png    320w,
      /assets/images/image-400x196.png    400w,
      /assets/images/image-640x314.png    640w,
      /assets/images/image-800x392.png    800w,
      /assets/images/image-1024x502.png  1024w,
      /assets/images/image-1280x627.png  1280w,
      /assets/images/image-1440x706.png  1440w,
      /assets/images/image-1920x941.png  1920w,
      /assets/images/image-2208x1080.png 2208w
    "
    src="/assets/images/image-2208x1080.png"
    sizes="(min-width: 2208px) 2208px, 100vw"
    width="2208"
    height="1080"
    alt=""
    decoding="async"
    loading="lazy"
  />
</picture>
```

### PictureProps

`<Picture>` コンポーネントには、プラグインオプション `optimize` を含めた props を個別に渡してオーバーライドできます。また、画面幅によって元画像を変更するアートディレクティブを `artDirectives` に設定できます。

```ts
type PictureProps = {
  src: string
  sizes?: string
  width?: number | string
  height?: number | string
  alt?: string
  decoding?: HTMLImageElement["decoding"]
  loading?: HTMLImageElement["loading"]
  artDirectives?: ArtDirective[]
} & Partial<ImagesOptimize> &
  React.HTMLAttributes<HTMLImageElement>

type ImagesOptimize = Omit<ImageOptimize, "format"> & {
  formats: ImageFormat[]
}

type ArtDirective = {
  media: string
  src: string
  sizes?: string
  width?: number | string
  height?: number | string
} & Partial<ImagesOptimize>
```
