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

export type HeadData = {
  htmlAttributes?: React.HTMLAttributes<HTMLHtmlElement>
  bodyAttributes?: React.HTMLAttributes<HTMLBodyElement>
  title?: string
  tags?: React.ReactNode[]
}

export type SetHeadData = (key: string, value: any) => void

type StoryArgsOfComponent<T> = T extends (...args: infer U) => any
  ? U[0]
  : never
type StoryArgsOfMetaComponent<M> = M extends StoryMeta<infer T>
  ? StoryArgsOfComponent<T>
  : never

export type StoryDecoratorFunction = (
  Story: React.ComponentType<{ [key: string]: any }>
) => JSX.Element

export type StoryParameters = {
  layout?: "padded" | "centered" | "fullscreen"
  viewport?: {
    defaultViewport?: string
  }
}

export type StoryMeta<T> = {
  id?: string
  title: string
  draft?: boolean
  hidden?: boolean
  component: T
  args?: Partial<StoryArgsOfComponent<T>>
  parameters?: StoryParameters
  decorators?: StoryDecoratorFunction[]
}

export type StoryObj<M = StoryMeta<any>> = {
  name?: string
  draft?: boolean
  hidden?: boolean
  args?: Partial<StoryArgsOfMetaComponent<M>>
  parameters?: StoryParameters
  decorators?: StoryDecoratorFunction[]
}
