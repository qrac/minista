```tsx
import { Head } from "minista"
import MyComponent from "../components/my-component.tsx"

export default function ({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head>
        <title>minista</title>
        <link rel="stylesheet" href="src/assets/style.css" />
        <script src="src/assets/script.ts" />
      </Head>
      <header className="header">minista</header>
      <main>
        <MyComponent title="Static site generator" />
      </main>
    </>
  )
}
```
