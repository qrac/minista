# minista

<p>
  <a aria-label="Made by QRANOKO" href="https://qranoko.jp">
    <img src="https://img.shields.io/badge/MADE%20BY%20QRANOKO-212121.svg?style=for-the-badge&labelColor=212121">
  </a>
  <a aria-label="NPM version" href="https://www.npmjs.com/package/minista">
    <img alt="" src="https://img.shields.io/npm/v/minista.svg?style=for-the-badge&labelColor=212121">
  </a>
  <a aria-label="License" href="https://github.com/qrac/minista/blob/master/LICENSE">
    <img alt="" src="https://img.shields.io/npm/l/minista.svg?style=for-the-badge&labelColor=212121">
  </a>
</p>

## Site & Documentation

https://minista.qranoko.jp

## About

minista（ミニスタ）は React の JSX から綺麗な HTML を作る日本製のスタティックサイトジェネレーターです。

## How To Use

### Automatic Setup

```sh
$ npm create minista@latest
```

### Manual Setup

```sh
$ npm install --save-dev minista react react-dom
$ touch ./src/pages/index.jsx
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

| コマンド          | 内容                            |
| ----------------- | ------------------------------- |
| `minista`         | 開発モード（`Ctrl + C` で停止） |
| `minista build`   | 静的書き出し                    |
| `minista preview` | 静的書き出し後の動作確認        |

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
