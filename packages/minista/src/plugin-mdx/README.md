# pluginMdx

- MDX・Markdown の変換に対応

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

| Option          | Type            | Detail                  |
| --------------- | --------------- | ----------------------- |
| `remarkPlugins` | `PluggableList` | remark プラグインを設定 |
| `rehypePlugins` | `PluggableList` | rehype プラグインを設定 |

- Dependencies: [@mdx-js/rollup](https://mdxjs.com/packages/rollup/)

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

## Frontmatter

- `props`: Frontmatter は props として Layout や Page で使用可能

```mdx
---
title: Index
draft: false // true = Don't build the page
---

# {props.title}
```
