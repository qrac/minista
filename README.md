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

## About

minista（ミニスタ）は、React(JSX)で書ける web コーディング用の小さいスタティックサイトジェネレーターです。

- ゼロコンフィグで始められる
- React(JSX)から静的な HTML を出力
- CSS と JavaScript を Minify 出力
- Next.js 風のディレクトリ構成

## How To Use

### [npm](https://www.npmjs.com/package/minista)

#### Setup

```bash
$ npm install --save-dev minista react react-dom
```

```bash
# ----------------------------------------------------
# Directory Example
# ----------------------------------------------------

public # Copy root
src
├── assets
│   └── index.js # Required!
├── components
│   └── layout.js
└── pages # Required!
    ├── about
    │   └── index.js
    └── index.js
```

<!-- prettier-ignore -->
```js
//----------------------------------------------------
// Page Example
//----------------------------------------------------

import React from "react" // Required!
import { render } from "minista" // Required!

const Home = () => {
  return render( // Required!
    <h1>Hello</h1>
  )
}

export default Home
```

#### Develop

```bash
# Start
$ minista

# Stop
Press Ctrl+C
```

#### Build

```bash
$ minista build
```

## Components

### Comment

#### Input

```js
import React from "react"
import { render, Comment } from "minista"

const Home = () => {
  return render(
    <>
      <Comment text="Comment Test" />
      <h1>Hello</h1>
    </>
  )
}

export default Home
```

#### output

```html
<body>
  <!-- Comment Test -->
  <h1>Hello</h1>
</body>
```

### Sitemap

納品用のサイトマップを簡単に作るコンポーネントを npm で追加可能です。納品物に追加の CSS や JavaScript をバンドルさせません。

- minista sitemap: [repo](https://github.com/qrac/minista-sitemap) / [npm](https://www.npmjs.com/package/minista-sitemap)

## Customize

### webpack

プロジェクトの root に `webpack.config.js` を配置することで設定をマージできます。

```js
// Example
const webpackConfig = {
  devServer: {
    open: ["/index.html"],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "assets/custom.css",
    }),
    new CopyPlugin({
      patterns: [{ from: "./static", to: "./", noErrorOnMissing: true }],
    }),
  ],
  optimization: {
    minimizer: [
      /* All replacements */
    ],
  },
}

module.exports = webpackConfig
```

### PostCSS

PostCSS はゼロコンフィグで以下のプラグインが適応されますが、プロジェクトの root に `postcss.config.js` を配置することで設定を上書きできます。

```js
module.exports = {
  plugins: {
    "postcss-import": {},
    "postcss-flexbugs-fixes": {},
    "postcss-sort-media-queries": {},
    "postcss-preset-env": {},
  },
}
```

### Sass / SCSS

`sass-loader` と `sass`（または `node-sass`）を追加することで使えます。

```bash
$ npm install --save-dev sass-loader sass
```

## Media

- [React(JSX)で書けるコーディング用 SSG - minista v0](https://zenn.dev/qrac/articles/7537521afcd1bf)

## Respect

- [Charge — an opinionated, zero-config static site generator](https://charge.js.org/)
- [Next.js by Vercel - The React Framework](https://nextjs.org/)
- [Node Interface | webpack](https://webpack.js.org/api/node/)
- [テンプレートエンジンに React を使いつつ、きれいな HTML を生成したいんじゃ！！](https://zenn.dev/otsukayuhi/articles/e52651b4e2c5ae7c4a17)
- [EJS をやめて React で HTML を書く](https://zenn.dev/hisho/scraps/4ef6c6106a6395)
- [MPA(マルチページアプリ)で webpack を使う](https://www.key-p.com/blog/staff/archives/107125)

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
