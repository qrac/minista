import type { ExoticComponent } from "react"
import type vite from "vite"

export type MinistaUserConfig = {
  outDir?: string
  publicDir?: string
  pageDir?: string
  pageExt?: string[] | string
  tempPageDir?: string
  vite?: vite.InlineConfig
}

export type RootStaticContent = {
  component: RootJsxContent
  staticData: GlobalStaticData
}
export type RootEsmContent = {
  default: RootJsxContent
  getStaticData?: GetGlobalStaticData
}
export type RootJsxContent =
  | ExoticComponent<{ children?: React.ReactNode }>
  | React.ReactElement<any, string | React.JSXElementConstructor<any>>
export type GlobalStaticData = { props?: {} } | undefined
export type GetGlobalStaticData = () => Promise<GlobalStaticData>

export type PageEsmContent = {
  default: PageJsxContent
  getStaticData?: GetStaticData
}
export type PageJsxContent = React.ReactElement<
  any,
  string | React.JSXElementConstructor<any>
>
export type StaticData = StaticDataList | StaticDataItem | undefined
export type StaticDataList = StaticDataItem[]
export type StaticDataItem = {
  props?: {}
  paths?: {}
}
export type StaticDataCache = { key: [StaticDataList] } | {}
export type GetStaticData = () => Promise<StaticData>
