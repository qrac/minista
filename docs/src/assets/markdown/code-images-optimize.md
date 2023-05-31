```ts
type ImagesOptimize = {
  formats: ImageFormat[]
} & Omit<ImageOptimize, "format">
```
