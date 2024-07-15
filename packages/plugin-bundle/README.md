# minista-plugin-bundle

## About

[minista](https://minista.qranoko.jp) および [Vite](https://ja.vitejs.dev/) で動作するプラグイン。

- テンプレートのルートパスから CSS・JS・画像をエントリー
- テンプレートでインポートした CSS を結合して出力
- テンプレートでインポートした画像を出力

## How To Use

```sh
$ npm install minista-plugin-bundle
```

```js
// ./minista.config.js
import { pluginBundle } from "minista-plugin-bundle"

export default {
  plugins: [pluginBundle()],
}
```

## Options

| Option    | Type       | Detail                                                            |
| --------- | ---------- | ----------------------------------------------------------------- |
| `src`     | `string[]` | インポートを検出するテンプレートを Vite の `fast-glob` 形式で指定 |
| `outName` | `string`   | インポートした CSS を結合出力する場合のファイル名                 |

```js
// ./minista.config.js (with default options)
import { pluginBundle } from "minista-plugin-bundle"

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

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
