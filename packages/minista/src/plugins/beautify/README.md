# pluginBeautify

ビルド時に HTML・CSS・JS を整形するプラグイン。

## How To Use

```js
// ./minista.config.js
import { pluginBeautify } from "minista"

export default {
  plugins: [pluginBeautify()],
}
```

## Options

```js
// ./minista.config.js (with default options)
import { pluginBeautify } from "minista"

export default {
  plugins: [
    pluginBeautify({
      src: ["**/*.{html,css,js}"],
      htmlOptions: {
        indent_size: 2,
        max_preserve_newlines: 0,
        indent_inner_html: true,
        extra_liners: [],
        inline: [
          "span",
          "strong",
          "b",
          "small",
          "del",
          "s",
          "code",
          "br",
          "wbr",
        ],
      },
      cssOptions: {
        indent_size: 2,
        space_around_combinator: true,
      },
      jsOptions: {
        indent_size: 2,
      },
      removeImagePreload: true,
    }),
  ],
}
```

### src

- 型: `string[]`
- デフォルト: `["**/*.{html,css,js}"]`

対象ファイルを dist からの glob 形式で指定します。対象ファイルはビルドパイプラインに含まれているものから [picomatch](https://www.npmjs.com/package/picomatch) で選ばれます。

### htmlOptions

- 型: `HTMLBeautifyOptions`

[js-beautify](https://www.npmjs.com/package/js-beautify) の HTML フォーマットに関する設定。

### cssOptions

- 型: `HTMLBeautifyOptions`

[js-beautify](https://www.npmjs.com/package/js-beautify) の CSS フォーマットに関する設定。

### jsOptions

- 型: `HTMLBeautifyOptions`

[js-beautify](https://www.npmjs.com/package/js-beautify) の JavaScript フォーマットに関する設定。

### removeImagePreload

- 型: `boolean`
- デフォルト: `true`

Vite が HTML に出力する画像用の Preload タグを削除します。
