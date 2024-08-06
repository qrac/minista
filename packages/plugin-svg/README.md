# minista-plugin-svg

## About

[minista](https://minista.qranoko.jp) および [Vite](https://ja.vitejs.dev/) で動作するプラグイン。

- SVG ファイルを HTML にインラインで展開
- SVGO を使った最適化処理

## How To Use

```sh
$ npm install minista-plugin-svg
```

```js
// ./minista.config.js
import { pluginSvg } from "minista-plugin-svg"

export default {
  plugins: [pluginSvg()],
}
```

- https://svgo.dev/docs/preset-default/

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
