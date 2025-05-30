# minista

## Site & Documentation

- https://minista.qranoko.jp

## About

minista（ミニスタ）は React の JSX から綺麗な HTML を作るスタティックサイトジェネレーターです。

- すべての機能を Vite プラグインとして提供
- ビルド時に自動で Vite の「SSR ビルド + 通常ビルド」を実行

## How To Use

### Automatic Setup

```sh
$ npm create minista@latest
```

### Manual Setup

```sh
$ npm install --save-dev minista vite react react-dom
$ touch ./minista.config.js
$ touch ./src/pages/index.jsx
```

```js
// ./minista.config.js
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
"scripts": {
  "dev": "minista",
  "build": "minista build",
  "preview": "minista preview",
}
```

## Commands

[Vite の CLI コマンドとオプション](https://ja.vitejs.dev/guide/cli.html)がすべて使えます。

| コマンド                 | 内容                            |
| ------------------------ | ------------------------------- |
| `minista [root]`         | 開発モード（`Ctrl + C` で停止） |
| `minista build [root]`   | 静的書き出し                    |
| `minista preview [root]` | 静的書き出し後の動作確認        |

| minista 独自のオプション | 内容                              |
| ------------------------ | --------------------------------- |
| `--oneBuild`             | minista のビルドを 1 回に制限する |

## Config

[Vite の設定](https://ja.vitejs.dev/config/)がすべて使えます。コンフィグファイルは `minista.config.{ts,js}`・`vite.config.{ts,js}` のどちらでも動作し、`defineConfig` も使用できます。

```ts
// ./minista.config.ts
import { defineConfig, pluginSsg } from "minista"

export default defineConfig({
  plugins: [pluginSsg()],
})
```

minista は SSR ビルドと通常ビルドを連続で行うため、ビルドの一括設定がエラーに繋がる場合があります。これは設定を SSR ビルド用・通常ビルド用に切り分けることで解消できます。

```ts
// ./minista.config.ts
import { defineConfig, pluginSsg } from "minista"

const common = defineConfig({
  plugins: [pluginSsg()],
})

export default defineConfig(({ command, isSsrBuild }) => {
  if (command === "serve") return { ...common }
  if (command === "build" && isSsrBuild) return { ...common }
  if (command === "build" && !isSsrBuild) {
    return { ...common, build: { minify: false } }
  }
  return { ...common }
})
```

## Plugins

minista の各機能は同封されているプラグインをコンフィグに登録することで動作します。使い方は各ディレクトリの README.md を参照ください。

- [pluginSsg](https://github.com/qrac/minista/tree/main/packages/minista/src/plugins/ssg): React の JSX を静的な HTML に変換
- [pluginBundle](https://github.com/qrac/minista/tree/main/packages/minista/src/plugins/bundle): CSS・JS・画像をビルドプロセスに乗せる
- [pluginMdx](https://github.com/qrac/minista/tree/main/packages/minista/src/plugins/mdx): MDX・Markdown の HTML 変換に対応
- [pluginImage](https://github.com/qrac/minista/tree/main/packages/minista/src/plugins/image): 画像を最適化・リモート画像をダウンロード
- [pluginSvg](https://github.com/qrac/minista/tree/main/packages/minista/src/plugins/svg): SVG ファイルを HTML にインライン展開
- [pluginSprite](https://github.com/qrac/minista/tree/main/packages/minista/src/plugins/sprite): SVG ファイルを スプライト化して出力
- [pluginIsland](https://github.com/qrac/minista/tree/main/packages/minista/src/plugins/island): ページの一部を React App 化
- [pluginSearch](https://github.com/qrac/minista/tree/main/packages/minista/src/plugins/search): 全文検索機能を追加
- [pluginBeautify](https://github.com/qrac/minista/tree/main/packages/minista/src/plugins/beautify): ビルド時に HTML・CSS・JS を整形
- [pluginArchive](https://github.com/qrac/minista/tree/main/packages/minista/src/plugins/archive): ビルド時に圧縮ファイルを生成

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
