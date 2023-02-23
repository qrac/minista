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

## Concept

minista はウェブ制作業務における 3 つの目的で作られています。

- **ゼロストレス**: エディタサポート・動作速度・安定性にこだわる
- **アーカイブ**: 依存を排除した死ににくいウェブコンテンツを作る
- **プロトタイプ**: 本物に近い試作品をインブラウザデザインする

## Feature

minsta はウェブ制作者にとって都合の良い機能を備えています。

- React の JSX で書ける
- TypeScript ファースト
- Vite による高速処理
- ランタイムゼロ 100% 静的出力
- CSS・JS を個別ファイル出力
- 画像の最適化
- リモート画像をダウンロード
- SVG スプライトアイコン
- CMS のデータと連携
- Markdown の変換
- シンタックスハイライト
- 部分的なハイドレーション
- 内部完結型の全文検索
- Shift-JIS 変換
- 納品想定の綺麗なデータ
- 納品リストを自動生成
- 納品用 Zip を自動生成

## How To Use

### Automatic Setup

```bash
$ npm init minista@latest
```

### Manual Setup

```bash
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

| command           | detail                                 |
| ----------------- | -------------------------------------- |
| `minista`         | Development mode, Press Ctrl+C to stop |
| `minista build`   | Static site generate                   |
| `minista preview` | Static data preview                    |

## Config

```bash
$ touch ./minista.config.js
```

```js
// ./minista.config.js (ex: Default)
import { defineConfig } from "minista"

export default defineConfig({
  root: "",
  base: "/",
  public: "public",
  out: "dist",
  assets: {
    entry: "",
    outDir: "assets",
    outName: "[name]",
    images: {
      outDir: "assets/images",
      outName: "[name]",
      remoteName: "remote",
      optimize: {
        layout: "constrained",
        breakpoints: [
          320, 400, 640, 800, 1024, 1280, 1440, 1920, 2560, 2880, 3840,
        ],
        resolution: [1, 2],
        format: "inherit",
        formatOptions: {},
        quality: undefined,
        aspect: undefined,
        background: undefined,
        fit: "cover",
        position: "centre",
      },
    },
    svgr: {
      svgrOptions: {},
    },
    icons: {
      srcDir: "src/assets/icons",
      outDir: "assets/images",
      outName: "[dirname]",
      svgstoreOptions: {
        cleanSymbols: ["fill", "stroke", "stroke-linejoin", "stroke-width"],
      },
    },
    fonts: {
      outDir: "assets/fonts",
      outName: "[name]",
    },
    bundle: {
      outName: "bundle",
    },
    partial: {
      usePreact: false,
      useIntersectionObserver: true,
      outName: "hydrate",
      rootAttrSuffix: "partial-hydration",
      rootValuePrefix: "ph",
      rootDOMElement: "div",
      rootStyle: { display: "contents" },
      intersectionObserverOptions: {
        root: null,
        rootMargin: "0px",
        thresholds: [0],
      },
    },
  },
  resolve: {
    alias: [],
  },
  css: {
    modules: {
      scopeBehaviour: "local",
      globalModulePaths: [],
      generateScopedName: undefined,
      hashPrefix: "",
      localsConvention: "camelCaseOnly",
    },
    preprocessorOptions: {
      scss: {},
      less: {},
      stylus: {},
    },
  },
  markdown: {
    useRemarkGfm: true,
    useRehypeHighlight: true,
    remarkGfmOptions: {},
    rehypeHighlightOptions: {},
    mdxOptions: {
      remarkPlugins: [],
      rehypePlugins: [],
    },
  },
  search: {
    outDir: "assets",
    outName: "search",
    include: ["**/*"],
    exclude: ["/404"],
    baseUrl: "",
    trimTitle: "",
    targetSelector: "[data-search]",
    hit: {
      minLength: 3,
      number: false,
      english: true,
      hiragana: false,
      katakana: true,
      kanji: true,
    },
  },
  delivery: {
    include: ["**/*"],
    exclude: ["/404"],
    trimTitle: "",
    sortBy: "path",
    archives: [],
  },
  beautify: {
    useHtml: true,
    useAssets: false,
    htmlOptions: {
      indent_size: 2,
      max_preserve_newlines: 0,
      indent_inner_html: true,
      extra_liners: [],
      inline: ["span", "strong", "b", "small", "del", "s", "code", "br", "wbr"],
    },
    cssOptions: {
      indent_size: 2,
      space_around_combinator: true,
    },
    jsOptions: {
      indent_size: 2,
    },
  },
  vite: {},
})
```

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
