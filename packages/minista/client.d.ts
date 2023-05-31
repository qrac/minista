/// <reference types="vite/client" />

// MDX
declare module "*.mdx" {
  import { MDXProps } from "mdx/types"

  export default function MDXContent(props: MDXProps): JSX.Element
}
declare module "*.md" {
  import { MDXProps } from "mdx/types"

  export default function MDXContent(props: MDXProps): JSX.Element
}

// SVGR
declare module "*.svg" {
  import * as React from "react"

  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >
}

// Partial Hydration
declare module "*?ph" {
  import * as React from "react"

  const ph: React.FunctionComponent<React.PropsWithChildren>
  export default ph
}
