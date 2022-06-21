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

minista（ミニスタ）は、React の JSX で書けるスタティックサイトジェネレーターです。Next.js 風の快適な環境で開発しながら 100% 静的に出力できます。SaaS の web テンプレートコーディング業務を想定しているため、ビルド後のデータが綺麗（ヒューマンリーダブル）です。

## How To Use

### Automatic Setup

```bash
$ npm init minista@latest
```

### Manual Setup

```bash
$ npm install --save-dev minista react@17 react-dom@17
```

```bash
public # Copy dist
src
└── pages # Required!
    ├── about
    │   └── index.jsx
    └── index.jsx
```

<!-- prettier-ignore -->
```js
const PageHome = () => {
  return (
    <h1>Home</h1>
  )
}

export default PageHome
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

## Customize

```js
// minista.config.ts
import { defineConfig } from "minista"

export default defineConfig({
  base: "/", // string
  public: "public", // string
  out: "dist", // string
  root: {
    srcDir: "src", // string
    srcName: "root", // string
    srcExt: ["tsx", "jsx"], // string[]
  },
  pages: {
    srcDir: "src/pages", // string
    srcExt: ["tsx", "jsx", "md", "mdx"], // string[]
  },
  assets: {
    entry: "",
    // | string
    // | string[]
    // | { [key: string]: string }
    // | {
    //      name?: string
    //      input: string
    //      insertPages: string | string[] | { include: string[]; exclude?: string[] }
    //   }[]
    outDir: "assets", // string
    outName: "[name]", // string
    bundle: {
      outName: "bundle", // string
    },
    partial: {
      usePreact: false, // boolean
      useIntersectionObserver: true, // boolean
      outName: "partial", // string
      rootAttrSuffix: "partial-hydration", // string
      rootValuePrefix: "ph", // string
      rootDOMElement: "div", // "div" | "span"
      rootStyle: { display: "contents" }, // React.CSSProperties
      intersectionObserverOptions: {
        root: null, // Element | null
        rootMargin: "0px", // string
        thresholds: [1], // ReadonlyArray<number>
      },
    },
    images: {
      outDir: "assets/images", // string
      outName: "[name]", // string
    },
    fonts: {
      outDir: "assets/fonts", // string
      outName: "[name]", // string
    },
    svgr: {
      svgrOptions: {}, // https://react-svgr.com/docs/options/
    },
    icons: {
      useSprite: true, // boolean
      srcDir: "src/assets/icons", // string
      outDir: "assets/images", // string
      outName: "icons", // string
      svgstoreOptions: {
        cleanSymbols: ["fill", "stroke", "stroke-linejoin", "stroke-width"],
      }, // https://github.com/svgstore/svgstore#svgstore-options
    },
    download: {
      useRemote: false, // boolean
      remoteUrl: ["https://", "http://"], // string[]
      remoteName: "remote-[index]", // string
      outDir: "assets/images", // string
    },
  },
  vite: {}, // https://ja.vitejs.dev/config/
  resolve: {
    alias: [], // { [key: string]: string } | { find: string, replacement: string }[]
  },
  css: {
    modules: {
      cache: true,
      scopeBehaviour: "local",
      globalModulePaths: [],
      generateScopedName: undefined,
      hashPrefix: "",
      localsConvention: "camelCaseOnly",
    }, // https://ja.vitejs.dev/config/#css-modules
    preprocessorOptions: {
      scss: {},
      less: {},
      stylus: {},
    }, // https://ja.vitejs.dev/config/#css-preprocessoroptions
  },
  markdown: {
    syntaxHighlighter: "highlight", // "highlight" | "none"
    highlightOptions: {}, // https://github.com/rehypejs/rehype-highlight#options
    mdxOptions: {
      remarkPlugins: [], // https://mdxjs.com/packages/mdx/#optionsremarkplugins
      rehypePlugins: [], // https://mdxjs.com/packages/mdx/#optionsrehypeplugins
    },
  },
  search: {
    useJson: false, // boolean
    cache: false, // boolean
    outDir: "assets", // string
    outName: "search", // string
    include: ["**/*"], // string[]
    exclude: ["404"], // string[]
    trimTitle: "", // string
    targetSelector: "[data-search]", // string
    hit: {
      minLength: 3, // number
      number: false, // boolean
      english: true, // boolean
      hiragana: false, // boolean
      katakana: true, // boolean
      kanji: true, // boolean
    },
  },
  beautify: {
    useHtml: true, // boolean
    useAssets: false, // boolean
    htmlOptions: {
      indent_size: 2,
      max_preserve_newlines: 0,
      indent_inner_html: true,
      extra_liners: [],
      inline: ["span", "strong", "b", "small", "del", "s", "code", "br", "wbr"],
    }, // https://github.com/beautify-web/js-beautify#css--html
    cssOptions: {}, // https://github.com/beautify-web/js-beautify#css--html
    jsOptions: {}, // https://github.com/beautify-web/js-beautify#options
  },
})
```

## Libraries

- `minista-sitemap`: [repo](https://github.com/qrac/minista-sitemap) / [npm](https://www.npmjs.com/package/minista-sitemap)
- `minista-markdown`: [repo](https://github.com/qrac/minista-markdown) / [npm](https://www.npmjs.com/package/minista-markdown)

## Media

- [SSG + Partial Hydration (部分的な React App) - minista v2.4](https://zenn.dev/qrac/articles/b9c65c1c0be901)
- [Vite と esbuild を組み込み React 製 SSG を再構築 - minista v2](https://zenn.dev/qrac/articles/fbbbe7ccc3bdb1)
- [React で書ける SSG 改善点と今後について - minista v1](https://zenn.dev/qrac/articles/a24de970148c7e)
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
