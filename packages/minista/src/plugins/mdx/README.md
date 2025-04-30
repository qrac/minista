# pluginMdx

pluginSsg に MDX・Markdown のファイルを対応させるプラグイン。

## How To Use

```js
// ./minista.config.js
import { pluginMdx } from "minista"

export default {
  plugins: [pluginMdx()],
}
```

```mdx
# heading

## heading2

paragraph
```

## Options

```js
// ./minista.config.js (with default options)
import { pluginMdx } from "minista"

export default {
  plugins: [
    pluginMdx({
      remarkPlugins: [],
      rehypePlugins: [],
    }),
  ],
}
```

オプションは [@mdx-js/rollup](https://www.npmjs.com/package/@mdx-js/rollup) の Options と同一です。

remarkPlugins に remark-frontmatter または remark-mdx-frontmatter を用いると、デフォルトの設定を上書きできます。

## Frontmatter

フロントマターは `props` として Layout や Page で使用可能です。

```mdx
---
title: Index
draft: false // true = Don't build the page
---

# {props.title}
```
