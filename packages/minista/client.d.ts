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

// images
declare module "*.png" {
  const src: string
  export default src
}
declare module "*.jpg" {
  const src: string
  export default src
}
declare module "*.jpeg" {
  const src: string
  export default src
}
declare module "*.jfif" {
  const src: string
  export default src
}
declare module "*.pjpeg" {
  const src: string
  export default src
}
declare module "*.pjp" {
  const src: string
  export default src
}
declare module "*.gif" {
  const src: string
  export default src
}
declare module "*.ico" {
  const src: string
  export default src
}
declare module "*.webp" {
  const src: string
  export default src
}
declare module "*.avif" {
  const src: string
  export default src
}

// media
declare module "*.mp4" {
  const src: string
  export default src
}
declare module "*.webm" {
  const src: string
  export default src
}
declare module "*.ogg" {
  const src: string
  export default src
}
declare module "*.mp3" {
  const src: string
  export default src
}
declare module "*.wav" {
  const src: string
  export default src
}
declare module "*.flac" {
  const src: string
  export default src
}
declare module "*.aac" {
  const src: string
  export default src
}

// fonts
declare module "*.woff" {
  const src: string
  export default src
}
declare module "*.woff2" {
  const src: string
  export default src
}
declare module "*.eot" {
  const src: string
  export default src
}
declare module "*.ttf" {
  const src: string
  export default src
}
declare module "*.otf" {
  const src: string
  export default src
}

// other
declare module "*.webmanifest" {
  const src: string
  export default src
}
declare module "*.pdf" {
  const src: string
  export default src
}
declare module "*.txt" {
  const src: string
  export default src
}

// inline
declare module "*?raw" {
  const src: string
  export default src
}
declare module "*?url" {
  const src: string
  export default src
}
declare module "*?inline" {
  const src: string
  export default src
}

// markdown
declare module "*.mdx" {
  import { MDXProps } from "mdx/types"
  export default function MDXContent(props: MDXProps): JSX.Element
}
declare module "*.md" {
  import { MDXProps } from "mdx/types"
  export default function MDXContent(props: MDXProps): JSX.Element
}

// svg
declare module "*.svg" {
  import * as React from "react"
  const svgr: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >
  const svg: typeof svgr | string
  export default svg
}

// partial hydration
declare module "*?ph" {
  import * as React from "react"
  const ph: React.FunctionComponent<React.PropsWithChildren>
  export default ph
}
