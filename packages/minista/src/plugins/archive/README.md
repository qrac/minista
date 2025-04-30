# pluginArchive

ビルド時に圧縮ファイルを生成するプラグイン。

## How To Use

```js
// ./minista.config.js
import { pluginArchive } from "minista"

export default {
  plugins: [pluginArchive()],
}
```

## Options

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

### srcDir

- 型: `string`
- デフォルト: `"dist"`

圧縮対象のディレクトリをルートから指定します。

### outName

- 型: `string`
- デフォルト: `"dist"`

出力ディレクトリ及び出力名をルートから指定します。

### ignore

- 型: `string | string[]`
- デフォルト: `[]`

除外ファイルを [minimatch](https://www.npmjs.com/package/minimatch) の glob 形式で指定します。

- 例: `"src/pages/nest/*.tsx"`

### format

- 型: `Format`
- デフォルト: `"zip"`

[archiver](https://www.npmjs.com/package/archiver) の圧縮形式 `zip` または `tar` を指定します。

### options

- 型: `ArchiverOptions`
- デフォルト: `{ zlib: { level: 9 } }`

[archiver](https://www.npmjs.com/package/archiver) の圧縮オプションを指定します。

### multiple

- 型: `MultipleOptions`
- デフォルト: `[]`

2 つ以上の圧縮ファイルを生成する場合に、オプションを配列で渡します。`format` `options` は引き継ぎ可能です。

```js
// ./minista.config.js
import { pluginArchive } from "minista"

export default {
  plugins: [
    pluginArchive({
      srcDir: "dist",
      outName: "archives/dist",
      ignore: [],
      format: "zip",
      options: { zlib: { level: 9 } },
      multiple: [
        {
          srcDir: "src",
          outName: "archives/src",
        },
      ],
    }),
  ],
}
```

```sh
dist/archives/dist.zip
dist/archives/src.zip
```
