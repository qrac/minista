# minista

## Site & Documentation

- https://minista.qranoko.jp

## About

minista（ミニスタ）は、ReactのJSXとViteで100%静的なサイトを作るスタティックサイトジェネレーターです。

## Concept

- **すべてをJSXで書き、綺麗なHTMLを生成！**
- 静的HTMLが必要なウェブ制作の現場にもJSXのコンポーネント管理を導入したい
- 独自構文を使わず、エディタサポートの優れたTypeScriptを活用したい

## Features

- すべての機能をViteプラグインとして提供
- ビルド時に自動でViteの「SSRビルド+通常ビルド」を実行

## Setup

### Automatic

```sh
$ npm create minista@latest
```

### Manual

```sh
$ npm install --save-dev minista vite react react-dom
$ touch ./vite.config.js
$ touch ./src/pages/index.jsx
```

```js
// ./vite.config.js
import { pluginSsg } from "minista"

export default {
  plugins: [pluginSsg()],
}
```

```jsx
// ./src/pages/index.jsx
export default function () {
  return <h1>Hello!</h1>
}
```

`package.json` を開き、以下のスクリプトを追加します。

```json
{
  "scripts": {
    "dev": "minista",
    "build": "minista build",
    "preview": "minista preview"
  }
}
```

## CLI

| コマンド                 | 内容                                          |
| ------------------------ | --------------------------------------------- |
| `minista [root]`         | 開発モード（`Ctrl + C` で停止）               |
| `minista build [root]`   | 静的書き出し（SSRビルド後に連続で通常ビルド） |
| `minista preview [root]` | 静的書き出し後の動作確認                      |

[ViteのCLIコマンドオプション](https://ja.vitejs.dev/guide/cli.html)がすべて使えるほか、以下の独自オプションがあります。

| 独自のオプション | 内容                                           |
| ---------------- | ---------------------------------------------- |
| `--oneBuild`     | ministaのビルドを1回に制限（連続ビルドしない） |

## Config

[Viteのコンフィグ](https://ja.vitejs.dev/config/)がすべて使えます。コンフィグファイルは `vite.config.{ts,js}`・`minista.config.{ts,js}` のどちらでも動作し、`defineConfig` も使用できます。

```ts
// ./vite.config.ts
import { defineConfig, pluginSsg } from "minista"

export default defineConfig({
  plugins: [pluginSsg()],
})
```

ministaはViteのSSRビルドと通常ビルドを連続で行うため、ビルドの一括設定がエラーに繋がる場合があります。これは設定をSSRビルド用・通常ビルド用に切り分けることで解消できます。

```ts
// ./vite.config.ts
import { defineConfig, pluginSsg } from "minista"

export default defineConfig(({ command, isSsrBuild }) => {
  const isDev = command === "serve"
  const isSsr = command === "build" && isSsrBuild
  const isBuild = command === "build" && !isSsrBuild
  return { plugins: [pluginSsg()], build: { minify: isBuild ? false : true } }
})
```

## Plugins

ministaの各機能は同封されているプラグインをコンフィグに登録することで動作します。

- [pluginSsg](https://minista.qranoko.jp/docs/plugins/ssg): ReactのJSXを静的なHTMLに変換
- [pluginMdx](https://minista.qranoko.jp/docs/plugins/mdx): MDX・MarkdownをHTMLの変換に対応させる
- [pluginBundle](https://minista.qranoko.jp/docs/plugins/bundle): JSX内でimportしたCSS・画像を出力
- [pluginEntry](https://minista.qranoko.jp/docs/plugins/entry): CSS・JS・画像をビルドプロセスに乗せる
- [pluginImage](https://minista.qranoko.jp/docs/plugins/image):画像を最適化・リモート画像をダウンロード
- [pluginSvg](https://minista.qranoko.jp/docs/plugins/svg): SVGファイルをHTMLにインライン展開
- [pluginSprite](https://minista.qranoko.jp/docs/plugins/sprite): SVGファイルを スプライト化して出力
- [pluginComment](https://minista.qranoko.jp/docs/plugins/comment): HTMLにコメントを出力
- [pluginIsland](https://minista.qranoko.jp/docs/plugins/island):ページの一部をReact App化
- [pluginSearch](https://minista.qranoko.jp/docs/plugins/search):全文検索機能を追加
- [pluginBeautify](https://minista.qranoko.jp/docs/plugins/beautify):ビルド時にHTML・CSS・JSを整形
- [pluginArchive](https://minista.qranoko.jp/docs/plugins/archive):ビルド時に圧縮ファイルを生成

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
