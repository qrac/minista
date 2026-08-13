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
- Vite App Buildでrender／client environmentを1つのbuild lifecycleとして実行
- route、page、asset、diagnosticを`.minista`のJSONへ出力

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
| `minista build [root]`   | App Build lifecycleによる静的書き出し         |
| `minista preview [root]` | 静的書き出し後の動作確認                      |
| `minista check [root]`   | route／pageと`getStaticData()`の検査           |
| `minista inspect [root]` | Project Graphの概要表示                        |
| `minista explain <node-id> [root]` | Graph nodeの関係を説明               |

`check`、`inspect`、`explain`は`--json`に対応します。build後の`.minista/manifest.json`だけを確認する場合は`minista inspect --manifest --json`を使用できます。

v4の`--oneBuild`はv5で削除されました。指定すると`MINISTA_CLI_OPTION_REMOVED`で終了します。標準の`minista build`が1つのApp Build lifecycleを使用します。

## Config

[Viteのコンフィグ](https://ja.vitejs.dev/config/)がすべて使えます。コンフィグファイルは `vite.config.{ts,js}`・`minista.config.{ts,js}` のどちらでも動作し、`defineConfig` も使用できます。

```ts
// ./vite.config.ts
import { defineConfig, pluginSsg } from "minista"

export default defineConfig({
  plugins: [pluginSsg()],
})
```

ministaはrender environmentとclient environmentを1つのApp Build lifecycleで実行します。既存の`isSsrBuild`を使ったconfig関数もcompatibility adapterがenvironmentごとに評価するため、Node.js向けrender設定とbrowser向けclient設定を分けられます。

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
