```ts
type ArtDirective = {
  media: string
  src: string
  sizes?: string
  width?: number | string
  height?: number | string
} & Partial<ImagesOptimize>
```
