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
- Vite Environment APIを利用し、render／client environmentを単一のVite app buildで順にビルド
- route、page、asset、diagnosticを`.minista`のJSONへ出力

## Setup

Node.js 20.19以上または22.12以上、Vite 8.1以上、React／React DOM 19以上が必要です。Viteは最新minorの利用を推奨します。

### Automatic

```sh
npm create minista@latest
```

### Manual

```sh
npm install --save-dev minista vite react react-dom
touch ./vite.config.js
mkdir -p ./src/pages
touch ./src/pages/index.jsx
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
| `minista build [root]`   | Vite app buildによる静的書き出し         |
| `minista preview [root]` | 静的書き出し後の動作確認                      |
| `minista check [root]`   | route／pageと`getStaticData()`の検査           |
| `minista inspect [root]` | Project Graphの概要表示                        |
| `minista agents [root]` | agent向けガイドの表示・`--write`で案内を追加 |
| `minista explain <node-id> [root]` | Graph nodeの関係を説明               |

`check`、`inspect`、`explain`は`--json`に対応します。build後の生成workspace内の`manifest.json`だけを確認する場合は`minista inspect --manifest --json`を使用できます。

v4の`--oneBuild`はv5で削除されました。指定すると`MINISTA_CLI_OPTION_REMOVED`で終了します。標準の`minista build`が単一のVite app buildを使用します。

## Config

[Viteのコンフィグ](https://ja.vitejs.dev/config/)がすべて使えます。コンフィグファイルは `vite.config.{ts,js}`・`minista.config.{ts,js}` のどちらでも動作し、`defineConfig` も使用できます。

```ts
// ./vite.config.ts
import { defineConfig, pluginSsg } from "minista"

export default defineConfig({
  plugins: [pluginSsg()],
})
```

ministaはrender environmentとclient environmentを単一のVite app buildで順にビルドします。environmentごとに設定を分ける場合は、`environments`を使用します。

```ts
// ./vite.config.ts
import { defineConfig, pluginSsg } from "minista"

export default defineConfig({
  plugins: [pluginSsg()],
  environments: {
    client: {
      build: { minify: false },
    },
  },
})
```

既存の`isSsrBuild`を参照するconfigはcompatibility builderへfallbackします。詳細は[Config](https://minista.qranoko.jp/docs/config)を参照してください。

生成workspaceはproject rootに`package.json`があれば`node_modules/.minista/`、なければ`.minista/`です。

## Plugins

ministaの各機能は同封されているプラグインをコンフィグに登録することで動作します。

- [pluginSsg](https://minista.qranoko.jp/docs/plugins/ssg): JSX・MDXを静的なHTMLへ変換し、参照されたCSS・JavaScript・画像を出力
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
