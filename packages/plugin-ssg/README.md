# minista-plugin-ssg

## About

[minista](https://minista.qranoko.jp) および [Vite](https://ja.vitejs.dev/) で動作するプラグイン。

- `*.tsx` `*.jsx` ファイルを静的な HTML に変換

## How To Use

```sh
$ npm install minista-plugin-ssg
```

```js
// ./minista.config.js
import { pluginSsg } from "minista-plugin-ssg"

export default {
  plugins: [pluginSsg()],
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
import { pluginSsg } from "minista-plugin-ssg"

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

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
