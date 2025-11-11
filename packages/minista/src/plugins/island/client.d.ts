import "react"

declare module "react" {
  namespace JSX {
    interface IntrinsicAttributes {
      "client:load"?: boolean
      "client:idle"?: boolean | { timeout?: number }
      "client:visible"?: boolean | { rootMargin?: string }
      "client:media"?: string
      "client:only"?: boolean
    }
  }
  interface HTMLAttributes<T> {
    "client:load"?: boolean
    "client:idle"?: boolean | { timeout?: number }
    "client:visible"?: boolean | { rootMargin?: string }
    "client:media"?: string
    "client:only"?: boolean
  }
}
