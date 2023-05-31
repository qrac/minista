```ts
type GetStaticData = {
  (): Promise<StaticData | StaticData[]>
}
type StaticData = {
  paths?: {
    [key: string]: string
  }
  props: {
    [key: string]: any
  }
}
```
