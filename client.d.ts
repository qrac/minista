declare module "*.mdx" {
  import { MDXProps } from "mdx/types"
  export default function MDXContent(props: MDXProps): JSX.Element
}

declare module "*.md" {
  export { default } from "*.mdx"
}

declare module "*.svg" {
  import * as React from "react"

  const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >
  export default ReactComponent
}

declare module "*?ph" {
  import * as React from "react"

  const ReactComponent: React.FunctionComponent<React.PropsWithChildren>
  export default ReactComponent
}

declare module "*?raw" {
  const src: string
  export default src
}
