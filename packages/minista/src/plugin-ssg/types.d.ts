export type PluginOptions = {
  layout: string
  src: string[]
  srcBases: string[]
}
export type UserPluginOptions = Partial<PluginOptions>

export type Metadata = {
  title?: string
  draft?: boolean
  [key: string]: any
}

export type PageProps = {
  url: string
  title: string
  draft: boolean
  [key: string]: any
}

export type LayoutProps = PageProps & {
  children: React.ReactNode
}

export type GetStaticData = {
  (): Promise<StaticData | StaticData[]>
}

export type StaticData = {
  paths?: { [key: string]: string }
  props: { [key: string]: any }
}

export type LayoutComponent = () => React.CElement<
  { [key: string]: any },
  React.Component<LayoutProps, {}, any>
>

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

export type PageComponent = () => React.CElement<
  { [key: string]: any },
  React.Component<PageProps, {}, any>
>

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
  outputHtmlPath: string
  html: string
}
