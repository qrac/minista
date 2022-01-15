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

minista（ミニスタ）は、React (TSX/JSX)で書けるスタティックサイトジェネレーターです。SaaS の web テンプレートコーディング業務を想定し、ビルド時の納品用データが綺麗（ヒューマンリーダブル）であることを重視しています。

- ゼロコンフィグで始められる
- React (TSX/JSX)から 100%静的な HTML を出力
- CSS と JavaScript を個別に Minify 出力
- SVG スプライトアイコンを自動生成
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

const PageHome = () => {
  return (
    <h1>Hello</h1>
  )
}

export default render(PageHome)  // Required!
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

const PageHome = () => {
  return (
    <>
      <Comment text="Comment Test" />
      <h1>Hello</h1>
    </>
  )
}

export default render(PageHome)
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

TypeScript `.tsx` でページを作成する場合はモジュールを追加し `tsconfig.json` をプロジェクトの root に配置。エントリーポイントとして `src/assets/index.ts` があれば `src/assets/index.js` の代わりに使用します。

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

```bash
# ----------------------------------------------------
# Directory Example
# ----------------------------------------------------

public # Copy root
src
├── assets
│   └── index.ts (or index.js)  # Required!
├── components
│   └── layout.js
└── pages # Required!
    ├── about
    │   └── index.tsx
    └── index.tsx
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

### Style only

プロジェクトに JavaScript が全く必要ない場合はエントリーポイントを CSS ファイルに変更します。これにより空の JavaScript ファイルを出力することなく納品用データを生成できます。

```js
//----------------------------------------------------
// Example: User > webpack.config.js
//----------------------------------------------------

const webpackConfig = {
  entry: { bundle: "./src/assets/index.css" },
}

module.exports = webpackConfig
```

### SVG sprite icons

`src/assets/icons` ディレクトリに SVG ファイルを置くと SVG スプライトアイコンの `dist/assets/icons.svg` が生成されます。以下のようなコンポーネントを作ることでアイコンを呼び出せます。

```js
// Example: ./src/components/svg-sprite-icon.tsx
export interface SvgSpriteIconProps {
  iconId?: string;
}

export const SvgSpriteIcon = (props: SvgSpriteIconProps) => {
  const { iconId } = props
  return (
    <svg className="icon" role="img">
      <use xlinkHref={`/assets/icons.svg#${iconId}`} />
    </svg>
  )
}
```

```html
<!-- dist html -->
<svg role="img" class="icon">
  <use xlink:href="/assets/icons.svg#star"></use>
</svg>
```

## Media

- [React(JSX)で書けるコーディング用 SSG - minista v0](https://zenn.dev/qrac/articles/7537521afcd1bf)

## Respect

- [Next.js by Vercel - The React Framework](https://nextjs.org/)
- [Charge — an opinionated, zero-config static site generator](https://charge.js.org/)
- [Eleventy, a simpler static site generator.](https://www.11ty.dev/)
- [Node Interface | webpack](https://webpack.js.org/api/node/)
- [natemoo-re/microsite](https://github.com/natemoo-re/microsite)
- [Astro](https://astro.build/)
- [テンプレートエンジンに React を使いつつ、きれいな HTML を生成したいんじゃ！！](https://zenn.dev/otsukayuhi/articles/e52651b4e2c5ae7c4a17)
- [EJS をやめて React で HTML を書く](https://zenn.dev/hisho/scraps/4ef6c6106a6395)
- [MPA(マルチページアプリ)で webpack を使う](https://www.key-p.com/blog/staff/archives/107125)
- [HTML コーディングでも React+TypeScript の開発体験を得る](https://zenn.dev/nanaki14/articles/html-template-react)
- [Astro と microCMS でポートフォリオサイトを作る](https://zenn.dev/takanorip/articles/c75717c280c81d)

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
