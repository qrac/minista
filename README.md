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

minista（ミニスタ）は、React (TSX/JSX)で書けるスタティックサイトジェネレーターです。SaaS の web テンプレートコーディング業務を想定し、ビルド時の納品用データが綺麗（ヒューマンリーダブル）であることを重視しています。CSS と JavaScript は個別に出力されます。

## How To Use

### Automatic

not supported

### Manual

```bash
$ npm install --save-dev minista@next react react-dom
```

```bash
# ----------------------------------------------------
# Directory Example
# ----------------------------------------------------

public # Copy dist
src
└── pages # Required!
    ├── about
    │   └── index.tsx
    └── index.tsx
```

<!-- prettier-ignore -->
```js
//----------------------------------------------------
// Page Example
//----------------------------------------------------

const PageHome = () => {
  return (
    <h1>Home</h1>
  )
}

export default PageHome
```

## Commands

### Develop

```bash
# Start
$ minista

# Stop
Press Ctrl+C
```

### Build

```bash
$ minista build
```

## Components

undecided

## Customize

not supported

## Media

- [React で書ける SSG 改善点と今後について - minista v1](https://zenn.dev/qrac/articles/a24de970148c7e)
- [React(JSX)で書けるコーディング用 SSG - minista v0](https://zenn.dev/qrac/articles/7537521afcd1bf)

## Respect

- [Next.js by Vercel - The React Framework](https://nextjs.org/)
- [Remix - Build Better Websites](https://remix.run/)
- [Vite](https://vitejs.dev/)
- [esbuild - An extremely fast JavaScript bundler](https://esbuild.github.io/)
- [Astro](https://astro.build/)
- [Charge — an opinionated, zero-config static site generator](https://charge.js.org/)
- [Eleventy, a simpler static site generator.](https://www.11ty.dev/)
- [natemoo-re/microsite](https://github.com/natemoo-re/microsite)
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
