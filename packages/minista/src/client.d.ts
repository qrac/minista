/// <reference types="vite/client" />

import type { MDXProps } from "mdx/types"
import type { JSX } from "react"

export type {
  Metadata,
  PageProps,
  LayoutProps,
  GetStaticData,
  StaticData,
} from "./plugins/ssg/types"

declare module "*.mdx" {
  export default function MDXContent(props: MDXProps): JSX.Element
}

declare module "*.md" {
  export default function MDXContent(props: MDXProps): JSX.Element
}

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
