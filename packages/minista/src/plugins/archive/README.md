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
// Default
pluginArchive({
  archives: [
    {
      srcDir: "dist",
      outName: "dist",
    },
  ],
})
```

### archives

生成パターンを配列で設定します。ユーザー側で配列を入力するとデフォルトの配列と差し替えられます。

### archives[].srcDir

- 型: `string`

圧縮対象のディレクトリをルートから指定します。

### archives[].outName

- 型: `string`

出力ディレクトリ及び出力名をルートから指定します。

### archives[].ignore

- 型: `string | string[]`
- デフォルト: `[]`

除外ファイルを [minimatch](https://www.npmjs.com/package/minimatch) の glob 形式で指定します。

- 例: `"src/pages/nest/*.tsx"`

### archives[].format

- 型: `Format`
- デフォルト: `"zip"`

[archiver](https://www.npmjs.com/package/archiver) の圧縮形式 `zip` または `tar` を指定します。

### archives[].options

- 型: `ArchiverOptions`
- デフォルト: `{ zlib: { level: 9 } }`

[archiver](https://www.npmjs.com/package/archiver) の圧縮オプションを指定します。
