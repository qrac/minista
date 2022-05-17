// CSS modules
type CSSModuleClasses = { readonly [key: string]: string }

declare module "*.module.css" {
  const classes: CSSModuleClasses
  export default classes
}
declare module "*.module.scss" {
  const classes: CSSModuleClasses
  export default classes
}
declare module "*.module.sass" {
  const classes: CSSModuleClasses
  export default classes
}
declare module "*.module.less" {
  const classes: CSSModuleClasses
  export default classes
}
declare module "*.module.styl" {
  const classes: CSSModuleClasses
  export default classes
}
declare module "*.module.stylus" {
  const classes: CSSModuleClasses
  export default classes
}
declare module "*.module.pcss" {
  const classes: CSSModuleClasses
  export default classes
}

// CSS
declare module "*.css" {
  const css: string
  export default css
}
declare module "*.scss" {
  const css: string
  export default css
}
declare module "*.sass" {
  const css: string
  export default css
}
declare module "*.less" {
  const css: string
  export default css
}
declare module "*.styl" {
  const css: string
  export default css
}
declare module "*.stylus" {
  const css: string
  export default css
}
declare module "*.pcss" {
  const css: string
  export default css
}

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
