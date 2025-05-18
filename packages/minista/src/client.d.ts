/// <reference types="vite/client" />

export type {
  Metadata,
  PageProps,
  LayoutProps,
  GetStaticData,
  StaticData,
} from "./plugins/ssg/types"
import type { HeadData } from "./plugins/ssg/types"
import type { ImageProps, PictureProps } from "./plugins/image/types"
import type { SvgProps } from "./plugins/svg/types"
import type { SpriteProps } from "./plugins/sprite/types"

export declare function Head(
  props: HeadData & {
    children?: React.ReactNode
  }
): null
export declare function Image(props: ImageProps): React.ReactElement
export declare function Picture(props: PictureProps): React.ReactElement
export declare function Svg(props: SvgProps): React.ReactElement
export declare function Sprite(props: SpriteProps): React.ReactElement

import "react"

declare module "react" {
  namespace JSX {
    // カスタムコンポーネントに対して
    interface IntrinsicAttributes {
      /** <Foo client:load /> */
      "client:load"?: boolean

      /** <Foo client:idle /> / <Foo client:idle={{ timeout: 500 }} /> */
      "client:idle"?: boolean | { timeout?: number }

      /** <Foo client:visible /> / <Foo client:visible={{ rootMargin: "200px" }} /> */
      "client:visible"?: boolean | { rootMargin?: string }

      /** <Foo client:media="(max-width:50em)" /> */
      "client:media"?: string

      /** <Foo client:only /> */
      "client:only"?: boolean
    }
  }

  // HTML 要素（<div> や <section> など）にも同じ属性を許可
  interface HTMLAttributes<T> {
    "client:load"?: boolean
    "client:idle"?: boolean | { timeout?: number }
    "client:visible"?: boolean | { rootMargin?: string }
    "client:media"?: string
    "client:only"?: boolean
  }
}
