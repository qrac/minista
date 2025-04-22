# pluginSsg

## About

- JSX ファイルを静的な HTML に変換

## How To Use

```js
// ./minista.config.js
import { pluginSsg } from "minista"

export default {
  plugins: [pluginSsg()],
}
```

```jsx
// ./src/pages/index.jsx
export default function () {
  return <h1>Hello!</h1>
}
```

## Options

| Option     | Type       | Detail                                               |
| ---------- | ---------- | ---------------------------------------------------- |
| `layout`   | `string`   | すべてのページテンプレートをラップするコンポーネント |
| `src`      | `string[]` | ページテンプレートを glob 形式で指定                 |
| `srcBases` | `string[]` | ページテンプレートを URL に変換する際に省くパス      |

```js
// ./minista.config.js (with default options)
import { pluginSsg } from "minista"

export default {
  plugins: [
    pluginSsg({
      layout: "/src/layouts/index.{tsx,jsx}",
      src: ["/src/pages/**/*.{tsx,jsx,mdx,md}"],
      srcBases: ["/src/pages"],
    }),
  ],
}
```

## Head

- head 内に title・meta・link・script・style を設置
- `htmlAttributes`: html の属性を変更
- `bodyAttributes`: body の属性を変更
- `key`: タグを後のものに差し替え

```tsx
// ./src/pages/index.jsx
import { Head } from "minista/client"

export default function () {
  return (
    <>
      <Head
        htmlAttributes={{ lang: "en" }}
        bodyAttributes={{ class: "body-class" }}
      >
        <title>Index</title>
        <meta name="description" content="base" key="desc" />
        <meta name="description" content="override" key="desc" />
      </Head>
      <h1>Index</h1>
    </>
  )
}
```

## Layout

- すべてのページテンプレートをラップするコンポーネント
- `/src/layouts/index.{tsx,jsx}`: 使用されるファイル
- `export default`: 使用されるコンポーネント
- `export const metadata`: ページとマージして使えるデータ
- `LayoutProps`: ページとマージされたデータ

```tsx
// ./src/layouts/index.tsx
import type { Matadata, LayoutProps } from "minista/client"

export const metadata: Matadata = {
  title: "Layout Title",
  foo: "bar", // [key: string]: any
}

export default function (props: LayoutProps) {
  return (
    <>
      {props.url /* Page URL */}
      {props.title /* Override with Page Title */}
      {props.draft /* boolean */}
      {props.foo /* any */}
      {props.children /* Page Contents */}
    </>
  )
}
```

## Page

- 各 HTML ページの元となる JSX 形式のテンプレート
- `/src/pages/**/*.{tsx,jsx}`: 使用されるファイル
- `export default`: 使用されるコンポーネント
- `export const metadata`: レイアウトとマージして使えるデータ
- `PageProps`: レイアウトとマージされたデータ

```tsx
// ./src/pages/index.tsx
import type { Matadata, PageProps } from "minista/client"

export const metadata: Matadata = {
  title: "Page Title",
  draft: false // true = Don't build the page
  foo: "bar", // [key: string]: any
}

export default function (props: PageProps) {
  return (
    <>
      {props.url /* Page URL */}
      {props.title /* Override Layout Title */}
      {props.draft /* boolean */}
      {props.foo /* any */}
    </>
  )
}
```

## Fetch

- リモートのデータを取得してページを生成
- `getStaticData()`: ページ生成前に非同期処理を実行
- `/src/pages/[foo]/[bar].{tsx,jsx}`: 動的ルーティング

```tsx
// ./src/pages/index.tsx
import type { StaticData, PageProps } from "minista/client"

export async function getStaticData(): Promise<StaticData> {
  const apiUrl = "https://api.github.com/repos/qrac/minista/issues"
  const apiParamsQuery = "?state=all&creator=qrac&per_page=5"
  const response = await fetch(apiUrl + apiParamsQuery)
  const data = await response.json()
  return {
    props: {
      issues: data,
    },
  }
}

type PagePropsWithIssues = PageProps & {
  issues?: { title: string; number: number }[]
}

export default function (props: PagePropsWithIssues) {
  const langList = ["en", "ja"]
  return (
    <>
      <h1>Issues</h1>
      {langList.map((lang) => (
        <div key={lang}>
          <h2>lang: {lang}</h2>
          <ul>
            {props.issues?.map((item, index) => (
              <li key={index}>
                <a href={`/issues/${lang}/${item.number}`}>{item.title}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}
```

```tsx
// ./src/pages/issues/[lang]/[number].tsx
import type { StaticData, PageProps } from "minista/client"

export async function getStaticData(): Promise<StaticData[]> {
  const apiUrl = "https://api.github.com/repos/qrac/minista/issues"
  const apiParamsQuery = "?state=all&creator=qrac&per_page=5"
  const response = await fetch(apiUrl + apiParamsQuery)
  const data = await response.json()
  const langList = ["en", "ja"]
  return langList
    .map((lang) =>
      data.map((item: PagePropsMergedIssue) => ({
        props: item,
        paths: { lang, number: item.number },
      }))
    )
    .flat()
}

type PagePropsMergedIssue = PageProps & {
  title: string
  body: string
  number: number
}

export default function (props: PagePropsMergedIssue) {
  return (
    <>
      <h1>{props.title}</h1>
      <div>{props.body}</div>
    </>
  )
}
```
