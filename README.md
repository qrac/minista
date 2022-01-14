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

minista（ミニスタ）は、React (TSX/JSX)で書ける web コーディング用の小さいスタティックサイトジェネレーターです。

- ゼロコンフィグで始められる
- React (TSX/JSX)から静的な HTML を出力
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
//----------------------------------------------------
// Example: User > webpack.config.js
//----------------------------------------------------

// No installation required.
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CopyPlugin = require("copy-webpack-plugin")

// Example of dev mode
const isDev = process.env.NODE_ENV !== "production"

const webpackConfig = {
  // Merge
  devServer: {
    open: ["/index.html"],
  },
  plugins: [
    // Replace
    new MiniCssExtractPlugin({
      filename: "assets/[name].css",
    }),
    // Replace
    new CopyPlugin({
      patterns: [{ from: "./static", to: "./", noErrorOnMissing: true }],
    }),
  ],

  // All optimization is replaced.
  optimization: {
    minimize: !isDev,
    minimizer: [
      /* Replace plugins */
    ],
  },
}

module.exports = webpackConfig
```

### TypeScript

TypeScript `.tsx` でページを作成する場合はモジュールを追加し `tsconfig.json` をプロジェクトの root に配置します。

```bash
$ npm install --save-dev typescript @types/react @types/react-dom
```

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "baseUrl": ".",
    "allowJs": true,
    "strict": true,
    "noImplicitAny": false,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "isolatedModules": false,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "jsx": "react-jsx"
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist", "webpack.config.js"]
}
```

### Babel

Babel はプロジェクトの root に `.babelrc` もしくは `babel.config.js` を配置することで設定を上書きできます。カスタマイズしない場合は以下の設定が適応されます。

```js
// JavaScript
const babelJsxOptions = {
  presets: [
    "@babel/preset-env",
    [
      "@babel/preset-react",
      {
        runtime: "automatic",
      },
    ],
  ],
}

// TypeScript
const babelTsxOptions = {
  presets: [
    "@babel/preset-env",
    [
      "@babel/preset-react",
      {
        runtime: "automatic",
      },
    ],
    ["@babel/preset-typescript"],
  ],
}
```

### PostCSS

PostCSS はゼロコンフィグで以下のプラグインが適応されますが、プロジェクトの root に `postcss.config.js` を配置することで設定を上書きできます。

```js
module.exports = {
  plugins: [
    "postcss-import",
    "postcss-flexbugs-fixes",
    "postcss-sort-media-queries",
    "postcss-preset-env",
  ],
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
