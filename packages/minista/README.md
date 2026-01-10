# minista

## Site & Documentation

- https://minista.qranoko.jp

## About

minista（ミニスタ）は、React の JSX と Vite で 100%静的なサイトを作るスタティックサイトジェネレーターです。

## Concept

- **すべてを JSX で書き、綺麗な HTML を生成！**
- 静的 HTML が必要なウェブ制作の現場にも JSX のコンポーネント管理を導入したい
- 独自構文を使わず、エディタサポートの優れた TypeScript を活用したい

## Features

- すべての機能を Vite プラグインとして提供
- ビルド時に自動で Vite の「SSR ビルド + 通常ビルド」を実行

## Setup

### Automatic

```sh
$ npm create minista@latest
```

### Manual

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
{
  "scripts": {
    "dev": "minista",
    "build": "minista build",
    "preview": "minista preview"
  }
}
```

## CLI

| コマンド                 | 内容                                           |
| ------------------------ | ---------------------------------------------- |
| `minista [root]`         | 開発モード（`Ctrl + C` で停止）                |
| `minista build [root]`   | 静的書き出し（SSR ビルド後に連続で通常ビルド） |
| `minista preview [root]` | 静的書き出し後の動作確認                       |

[Vite の CLI コマンドオプション](https://ja.vitejs.dev/guide/cli.html)がすべて使えるほか、以下の独自オプションがあります。

| 独自のオプション | 内容                                              |
| ---------------- | ------------------------------------------------- |
| `--oneBuild`     | minista のビルドを 1 回に制限（連続ビルドしない） |

## Config

[Vite のコンフィグ](https://ja.vitejs.dev/config/)がすべて使えます。コンフィグファイルは `minista.config.{ts,js}`・`vite.config.{ts,js}` のどちらでも動作し、`defineConfig` も使用できます。

```ts
// ./minista.config.ts
import { defineConfig, pluginSsg } from "minista"

export default defineConfig({
  plugins: [pluginSsg()],
})
```

minista は Vite の SSR ビルドと通常ビルドを連続で行うため、ビルドの一括設定がエラーに繋がる場合があります。これは設定を SSR ビルド用・通常ビルド用に切り分けることで解消できます。

```ts
// ./minista.config.ts
import { defineConfig, pluginSsg } from "minista"

export default defineConfig(({ command, isSsrBuild }) => {
  const isDev = command === "serve"
  const isSsr = command === "build" && isSsrBuild
  const isBuild = command === "build" && !isSsrBuild
  return { plugins: [pluginSsg()], build: { minify: isBuild ? false : true } }
})
```

## Plugins

minista の各機能は同封されているプラグインをコンフィグに登録することで動作します。

- [pluginSsg](https://minista.qranoko.jp/docs/plugins/ssg): React の JSX を静的な HTML に変換
- [pluginMdx](https://minista.qranoko.jp/docs/plugins/mdx): MDX・Markdown を HTML の変換に対応させる
- [pluginBundle](https://minista.qranoko.jp/docs/plugins/bundle): JSX 内で import した CSS・画像を出力
- [pluginEntry](https://minista.qranoko.jp/docs/plugins/entry): CSS・JS・画像をビルドプロセスに乗せる
- [pluginImage](https://minista.qranoko.jp/docs/plugins/image): 画像を最適化・リモート画像をダウンロード
- [pluginSvg](https://minista.qranoko.jp/docs/plugins/svg): SVG ファイルを HTML にインライン展開
- [pluginSprite](https://minista.qranoko.jp/docs/plugins/sprite): SVG ファイルを スプライト化して出力
- [pluginComment](https://minista.qranoko.jp/docs/plugins/comment): HTML にコメントを出力
- [pluginIsland](https://minista.qranoko.jp/docs/plugins/island): ページの一部を React App 化
- [pluginSearch](https://minista.qranoko.jp/docs/plugins/search): 全文検索機能を追加
- [pluginBeautify](https://minista.qranoko.jp/docs/plugins/beautify): ビルド時に HTML・CSS・JS を整形
- [pluginArchive](https://minista.qranoko.jp/docs/plugins/archive): ビルド時に圧縮ファイルを生成

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
