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

export declare function Head(
  props: HeadData & {
    children?: React.ReactNode
  }
): null
export declare function Image(props: ImageProps): React.ReactElement
export declare function Picture(props: PictureProps): React.ReactElement
