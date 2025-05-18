# pluginIsland

ページの一部を React App 化するプラグイン。Astro の Island を再現しています。

## How To Use

```js
// ./minista.config.js
import { pluginIsland } from "minista"

export default {
  plugins: [pluginIsland()],
}
```

```jsx
// ./src/pages/index.jsx
import { Counter } from "../components/counter"

export default function () {
  return <Counter client:load />
}
```

## Options

```js
// ./minista.config.js (with default options)
import { pluginIsland } from "minista"

export default {
  plugins: [
    pluginIsland({
      useSplitPages: true,
      outName: "island-[index]",
      rootAttrName: "island",
      rootDOMElement: "div",
      rootStyle: { display: "contents" },
    }),
  ],
}
```

### useSplitPages

- 型: `boolean`
- デフォルト: `true`

ページ毎に必要な JavaScript を分割して読み込みます。

### outName

- 型: `string`
- デフォルト: `"island-[index]"`

出力ファイル名。拡張子は含みません。以下の動的出力タグを使用できます。

- `[index]`: 生成された順番（開始: 1）

### rootAttrName

- 型: `string`
- デフォルト: `"island"`

ハイドレーションを行うルート要素のデータ属性名に使われる名前。

- 例: `data-island-client-directive`

### rootDOMElement

- 型: `"div" | "span"`
- デフォルト: `"div"`

ハイドレーションを行うルート要素の HTML タグ。

### rootStyle

- 型: `React.CSSProperties`
- デフォルト: `{ display: "contents" }`

ハイドレーションを行うルート要素に付与するスタイル。

## Client Island

minista は React の JSX テンプレートを 静的な HTML に変換し、クライアントサイドの JavaScript を取り除きます。

```tsx
import { Counter } from "../components/counter"

export default function () {
  return <Counter />
}
```

しかし、UI コンポーネントをインタラクティブにしたいシーンもあります。その場合は `client:*` ディレクティブを付与してください。minista はその部分だけの JavaScript を生成してハイドレーションします。`client:*` ディレクティブの種類と動作は次項を参照ください。

```tsx
import { Counter } from "../components/counter"

export default function () {
  return <Counter client:load />
}
```

## Client Directive

静的な HTML に変換される JSX の一部を React App として動作させる効果があります。`client:*` ディレクティブ配下では React の `useState` `useEffect` などインタラクティブな実装がすべて使えます。`client:*` ディレクティブは React Components または HTML タグに付与でき、同時に props を渡すことも可能です。

### client:load

ページの読み込みと同時に、コンポーネントをハイドレーションします。

```tsx
import { Counter } from "../components/counter"

export default function () {
  return <Counter client:load />
}
```

### client:idle

ページの初期読み込みが終わり、ブラウザが待機状態になったときにコンポーネントをハイドレーションします。

```tsx
import { Counter } from "../components/counter"

export default function () {
  return <Counter client:idle />
}
```

- `timeout`: 初期読み込みがこの時間に到達した場合にハイドレーションを優先して実行
  - 実装: `requestIdleCallback` の [timeout](https://developer.mozilla.org/ja/docs/Web/API/Window/requestIdleCallback#options)

```tsx
import { Counter } from "../components/counter"

export default function () {
  return <Counter client:idle={{ timeout: 5000 }} />
}
```

### client:visible

コンポーネントが画面内に表示されたときにハイドレーションします。

```tsx
import { Counter } from "../components/counter"

export default function () {
  return <Counter client:visible />
}
```

- `rootMargin`: コンポーネントの認識範囲を拡大
  - 実装: `IntersectionObserver` の [rootMargin](https://developer.mozilla.org/ja/docs/Web/API/IntersectionObserver/rootMargin)

```tsx
import { Counter } from "../components/counter"

export default function () {
  return <Counter client:visible={{ rootMargin: "200px" }} />
}
```

### client:media

CSS メディアクエリの条件が満たされたときに、コンポーネントをハイドレーションします。

```tsx
import { Counter } from "../components/counter"

export default function () {
  return <Counter client:media="(max-width: 500px)" />
}
```

### client:only

静的 HTML を出力せずに、`ReactDOM.createRoot` でコンポーネントをレンダリングします。タイミングは `client:load` と同じくページの読み込みと同時。静的な HTML を初期表示させたくない場合に有効ですが、レンダリング前の高さを確保できないため Cumulative Layout Shift（CLS）による画面のガタつきに注意が必要です。

```tsx
import { Counter } from "../components/counter"

export default function () {
  return <Counter client:only />
}
```

- `slot="fallback"`: 直下要素に付与することでレンダリング前に表示

```tsx
import { Counter } from "../components/counter"

export default function () {
  return (
    <div client:only>
      <div slot="fallback">Loading...</div>
      <Counter />
    </div>
  )
}
```
