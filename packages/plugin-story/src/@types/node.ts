import type {
  LayoutProps,
  PageProps,
  GetStaticData,
  StaticData,
  Metadata,
  StoryDecoratorFunction,
  StoryParameters,
  StoryMeta,
  StoryObj,
} from "./shared.js"

export * from "../node/index.js"

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

export type ImportedStories = ImportedJsStories | ImportedMdxStories

export type ImportedJsStories = {
  [key: string]: {
    default: StoryMeta<PageComponent>
    [key: string]: StoryObj<StoryMeta<PageComponent>>
  }
}
export type ImportedMdxStories = {
  [key: string]: {
    default: PageComponent
    metadata?: Metadata
  }
}

export type Story = {
  path: string
  title: string
  draft: boolean
  hidden: boolean
  component: PageComponent
  args: { [key: string]: any }
  parameters: StoryParameters
  decorators: StoryDecoratorFunction[]
  metadata: Metadata
}

export type FormatedPage = {
  path: string
  component: PageComponent
  getStaticData?: GetStaticData
  metadata: Metadata
}

export type ResolvedPage = {
  path: string
  component: PageComponent
  staticData: StaticData
  metadata: Metadata
}

export type SsgPage = {
  url: string
  fileName: string
  html: string
}
