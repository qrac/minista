/// <reference types="vite/client" />

export type {
  Metadata,
  PageProps,
  LayoutProps,
  GetStaticData,
  StaticData,
} from "./plugins/ssg/types"

import type { HeadData } from "./plugins/ssg/types"

export declare function Head(
  props: HeadData & {
    children?: React.ReactNode
  }
): null
