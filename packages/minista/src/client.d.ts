/// <reference types="vite/client" />

export type {
  Metadata,
  PageProps,
  LayoutProps,
  GetStaticData,
  StaticData,
} from "./plugin-ssg/types"

import type { HeadData } from "./head/types"

export declare function Head(
  props: HeadData & {
    children?: React.ReactNode
  }
): null
