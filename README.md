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

Next.js Like Development with 100% Static Generate.

## How To Use

### Automatic Setup

```bash
$ npm init minista@next
```

### Manual Setup

```bash
$ npm install --save-dev minista@next react react-dom
```

```bash
public # Copy dist
src
└── pages # Required!
    ├── about
    │   └── index.tsx
    └── index.tsx
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

Open `package.json` and add the following scripts:

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
  entry: "", // string | string[] | { [key: string]: string }
  outDir: "dist", // string
  assetsDir: "assets", // string
  bundleName: "bundle", // string
  iconsDir: "src/assets/icons", // string
  iconsName: "icons", // string
  publicDir: "public", // string
  vite: {}, // https://vitejs.dev/config/
  markdown: {
    syntaxHighlighter: "highlight", // "highlight" | "none"
    highlightOptions: {}, // https://github.com/rehypejs/rehype-highlight#options
    mdxOptions: {
      remarkPlugins: [], // https://mdxjs.com/packages/mdx/#optionsremarkplugins
      rehypePlugins: [], // https://mdxjs.com/packages/mdx/#optionsrehypeplugins
    },
  },
  beautify: {
    useHtml: true, // boolean
    useCss: false, // boolean
    useJs: false, // boolean
    htmlOptions: {
      indent_size: 2,
      max_preserve_newlines: 0,
      indent_inner_html: true,
      extra_liners: [],
    }, // https://github.com/beautify-web/js-beautify#css--html
    cssOptions: {}, // https://github.com/beautify-web/js-beautify#css--html
    jsOptions: {}, // https://github.com/beautify-web/js-beautify#options
  },
})
```

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
