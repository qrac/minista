# minista-plugin-sprite

## About

[minista](https://minista.qranoko.jp) および [Vite](https://ja.vitejs.dev/) で動作するプラグイン。

- SVG ファイルを SVG スプライトに結合して出力
- SVGO を使った最適化処理
- 既存の SVG スプライトをマージする機能

## How To Use

```sh
$ npm install minista-plugin-sprite
```

```js
// ./minista.config.js
import { pluginSprite } from "minista-plugin-sprite"

export default {
  plugins: [pluginSprite()],
}
```

- https://github.com/svg-sprite/svg-sprite/blob/HEAD/docs/configuration.md
- https://svgo.dev/docs/preset-default/

## License

- MIT

## Credit

- Author: [Qrac](https://qrac.jp)
- Organization: [QRANOKO](https://qranoko.jp)
