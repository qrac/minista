# pluginBeautify

- ビルド時に HTML・CSS・JS を整形

## How To Use

```js
// ./minista.config.js
import { pluginBeautify } from "minista"

export default {
  plugins: [pluginBeautify()],
}
```

## Options

| Option               | Type                  | Detail                                             |
| -------------------- | --------------------- | -------------------------------------------------- |
| `src`                | `string[]`            | 対象ファイルを dist からの glob 形式で指定         |
| `htmlOptions`        | `HTMLBeautifyOptions` | HTML のフォーマットに関する設定                    |
| `cssOptions`         | `CSSBeautifyOptions`  | CSS のフォーマットに関する設定                     |
| `jsOptions`          | `JSBeautifyOptions`   | JS のフォーマットに関する設定                      |
| `removeImagePreload` | `boolean`             | Vite が HTML に出力する画像用の Preload タグを削除 |

- Dependencies: [js-beautify](https://www.npmjs.com/package/js-beautify)

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
