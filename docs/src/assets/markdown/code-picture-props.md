```ts
type PictureProps = {
  src: string
  outName?: string
  sizes?: string
  width?: number | string
  height?: number | string
  alt?: string
  decoding?: HTMLImageElement["decoding"]
  loading?: HTMLImageElement["loading"]
  artDirectives?: ArtDirective[]
} & Partial<ImagesOptimize> &
  React.HTMLAttributes<HTMLImageElement>
```
