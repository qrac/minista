/// <reference types="vite/client" />

export type {
  Metadata,
  PageProps,
  LayoutProps,
  GetStaticData,
  StaticData,
} from "../src/plugin-ssg/types"

import type { HeadData } from "../src/head/types"

export declare function Head(
  props: HeadData & {
    children?: React.ReactNode
  }
): null
