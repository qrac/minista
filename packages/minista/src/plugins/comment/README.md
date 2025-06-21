# pluginComment

HTML にコメントを出力するプラグイン。

## How To Use

```js
// ./minista.config.js
import { pluginComment } from "minista"

export default {
  plugins: [pluginComment()],
}
```

```jsx
// ./src/pages/index.jsx
import { Comment } from "minista/assets"

export default function () {
  return <Comment text="Outputting comments in react jsx" />
}
```

## Options

※オプションはありません

## Comment

HTML にコメントを出力するコンポーネント。

```jsx
// ./src/pages/index.jsx
import { Comment } from "minista/assets"

export default function () {
  return (
    <>
      <Comment text="+ comment" />
      <h1>index</h1>
      <Comment text="- comment" />
    </>
  )
}
```

```xml
<!-- + comment -->
<h1>index</h1>
<!-- - comment -->
```

```ts
type CommentProps = CommentUseContent | CommentUseChildren

type CommentUseContent = {
  text: string
  children?: string
}
type CommentUseChildren = {
  text?: string
  children: string
}
```
