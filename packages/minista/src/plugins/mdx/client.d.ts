declare module "*.mdx" {
  import type { MDXProps } from "mdx/types"
  import type { JSX } from "react"
  export default function MDXContent(props: MDXProps): JSX.Element
}

declare module "*.md" {
  import type { MDXProps } from "mdx/types"
  import type { JSX } from "react"
  export default function MDXContent(props: MDXProps): JSX.Element
}
