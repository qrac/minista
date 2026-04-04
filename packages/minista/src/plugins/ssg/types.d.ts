export type PluginOptions = {
  layout: string
  src: string[]
  srcBases: string[]
}
export type UserPluginOptions = Partial<PluginOptions>

export interface Metadata {
  title?: string
  draft?: boolean
}

export interface PageProps {
  url: string
  title: string
  draft: boolean
}

export interface LayoutProps {
  url: string
  title: string
  draft: boolean
  children: React.ReactNode
}

export type GetStaticData = {
  (): Promise<StaticData | StaticData[]>
}

export type StaticData = {
  paths?: { [key: string]: string }
  props: { [key: string]: any }
}

export type LayoutComponent = () => React.ReactElement<LayoutProps>

export type ImportedLayouts = {
  [key: string]: {
    default?: LayoutComponent
    getStaticData?: GetStaticData
    metadata?: Metadata
  }
}

export type FormatedLayout = {
  component?: LayoutComponent
  getStaticData?: GetStaticData
  metadata?: Metadata
}

export type ResolvedLayout = {
  component?: LayoutComponent
  staticData: StaticData
  metadata: Metadata
}

export type PageComponent = () => React.ReactElement<PageProps>

export type ImportedPages = {
  [key: string]: {
    default: PageComponent
    getStaticData?: GetStaticData
    metadata?: Metadata
  }
}

export type FormatedPage = {
  url: string
  component: PageComponent
  getStaticData?: GetStaticData
  metadata: Metadata
}

export type ResolvedPage = {
  url: string
  component: PageComponent
  staticData: StaticData
  metadata: Metadata
}

export type SsgPage = {
  url: string
  fileName: string
  html: string
}

export type CustomHtmlAttributes = React.HTMLAttributes<HTMLHtmlElement> & {
  class?: string
}
export type CustomBodyAttributes = React.HTMLAttributes<HTMLBodyElement> & {
  class?: string
}

export type HeadData = {
  htmlAttributes?: CustomHtmlAttributes
  bodyAttributes?: CustomBodyAttributes
  title?: string
  tags?: React.ReactElement[]
}

export type HeadProps = HeadData & {
  children?: React.ReactNode
}

export type SetHeadData = (key: keyof HeadData, value: any) => void
