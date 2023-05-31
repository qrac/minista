```ts
type ImageProps = {
  src: string
  outName?: string
  sizes?: string
  width?: number | string
  height?: number | string
  alt?: string
  decoding?: HTMLImageElement["decoding"]
  loading?: HTMLImageElement["loading"]
} & Partial<ImageOptimize> &
  React.HTMLAttributes<HTMLImageElement>
```
