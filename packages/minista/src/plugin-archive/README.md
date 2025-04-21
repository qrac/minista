# pluginArchive

- ビルド時に圧縮ファイルを生成

## How To Use

```js
// ./minista.config.js
import { pluginArchive } from "minista"

export default {
  plugins: [pluginArchive()],
}
```

## Options

| Option     | Type              | Detail                                       |
| ---------- | ----------------- | -------------------------------------------- |
| `srcDir`   | `string`          | 圧縮対象のディレクトリをルートから指定       |
| `outName`  | `string`          | 出力ディレクトリ及び出力名をルートから指定   |
| `ignore`   | `string[]`        | 除外ファイルを glob 形式で指定               |
| `format`   | `Format`          | 圧縮形式（zip or tar）                       |
| `options`  | `ArchiverOptions` | 圧縮方法                                     |
| `multiple` | `{...}[]`         | 上記オプションを配列で渡して複数の圧縮を実行 |

- Dependencies: [archiver](https://github.com/archiverjs/node-archiver)

```js
// ./minista.config.js (with default options)
import { pluginArchive } from "minista"

export default {
  plugins: [
    pluginArchive({
      srcDir: "dist",
      outName: "dist",
      ignore: [],
      format: "zip",
      options: { zlib: { level: 9 } },
      multiple: [],
    }),
  ],
}
```

### multiple

- `multiple`: オプションを配列で渡して複数の圧縮を実行
- `format` `options` は引き継ぎ可能

```js
// ./minista.config.js
import { pluginArchive } from "minista"

export default {
  plugins: [
    pluginArchive({
      srcDir: "dist", //-> ./dist/**/*
      outName: "archives/dist", //-> ./dist/archives/dist.zip
      ignore: [],
      format: "zip",
      options: { zlib: { level: 9 } },
      multiple: [
        {
          srcDir: "src", //-> ./src/**/*
          outName: "archives/src", //-> ./dist/archives/src.zip
        },
      ],
    }),
  ],
}
```
