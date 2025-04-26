# pluginImage

- 画像を最適化・リモート画像をダウンロード

## How To Use

```js
// ./minista.config.js
import { pluginImage } from "minista"

export default {
  plugins: [pluginImage()],
}
```

```jsx
// ./src/pages/index.jsx
import { Image } from "minista/client"

export default function () {
  return (
    <>
      <Image src="/src/assets/image.png" />
    </>
  )
}
```

## Options

- Dependencies: [sharp](https://www.npmjs.com/package/sharp)

```js
// ./minista.config.js (with default options)
import { pluginImage } from "minista"

export default {
  plugins: [pluginImage({})],
}
```
