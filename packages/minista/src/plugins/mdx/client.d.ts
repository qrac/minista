declare module "*.mdx" {
  import { MDXProps } from "mdx/types"
  import { JSX } from "react"
  export default function MDXContent(props: MDXProps): JSX.Element
}

declare module "*.md" {
  import { MDXProps } from "mdx/types"
  import { JSX } from "react"
  export default function MDXContent(props: MDXProps): JSX.Element
}
