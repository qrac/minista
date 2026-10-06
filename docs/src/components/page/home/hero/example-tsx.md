```tsx
import { Head } from "minista/head"
import MyComponent from "../components/my-component"

export default function () {
  return (
    <>
      <Head>
        <title>minista</title>
        <link rel="stylesheet" href="/src/assets/style.css" />
        <script type="module" src="/src/assets/script.ts" />
      </Head>
      <MyComponent text="Static site generator" />
    </>
  )
}
```
