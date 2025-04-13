# minista

## Site & Documentation

- https://minista.qranoko.jp

## About

minista（ミニスタ）は React の JSX から綺麗な HTML を作るスタティックサイトジェネレーターです。

- すべての機能を Vite プラグインとして提供
- ビルド時に自動で「SSR ビルド + 通常ビルド」を実行

### Plugins

- [pluginSsg](https://github.com/qrac/minista/tree/main/packages/minista/src/plugin-ssg): JSX を静的な HTML に変換

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

```js
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

## Settings

[Vite の 設定](https://ja.vitejs.dev/config/)がすべて使えます。コンフィグファイルは `minista.config.{ts|js}` または `vite.config.{ts|js}` のどちらでも動作します。

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
