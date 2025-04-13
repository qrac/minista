## pluginSsg

## About

- JSX を静的な HTML に変換
- `Head` コンポーネントで head 内を編集

## How To Use

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

## Options

| Option       | Type       | Detail                                               |
| ------------ | ---------- | ---------------------------------------------------- |
| `layoutRoot` | `string`   | すべてのページテンプレートをラップするコンポーネント |
| `src`        | `string[]` | ページテンプレートを Vite の `fast-glob` 形式で指定  |
| `srcBases`   | `string[]` | ページテンプレートを URL に変換する際に省くパス      |

```js
// ./minista.config.js (with default options)
import { pluginSsg } from "minista"

export default {
  plugins: [
    pluginSsg({
      layoutRoot: "/src/layouts/index.{tsx,jsx}",
      src: [
        "/src/pages/**/*.{tsx,jsx,mdx,md}",
        "!/src/pages/**/*.mpa.{tsx,jsx}",
        "!/src/pages/**/*.enhance.{tsx,jsx}",
        "!/src/pages/**/*.stories.{tsx,jsx,mdx,md}",
      ],
      srcBases: ["/src/pages"],
    }),
  ],
}
```

## Head

- head 内に title・meta・link・script・style を設置
- `htmlAttributes` で html の属性を変更
- `bodyAttributes` で body の属性を変更
- `key` でタグを後のものに差し替え

```tsx
// ./src/pages/index.jsx
import { Head } from "minista/client"

export default function () {
  return (
    <>
      <Head
        htmlAttributes={{ lang: "en" }}
        bodyAttributes={{ class: "body-class" }}
      >
        <title>Index</title>
        <meta name="description" content="base" key="desc" />
        <meta name="description" content="override" key="desc" />
      </Head>
      <h1>Index</h1>
    </>
  )
}
```
