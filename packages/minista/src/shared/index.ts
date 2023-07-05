export * from "./comment.js"
export * from "./define.js"
export * from "./delivery.js"
export * from "./head.js"
export * from "./icon.js"
export * from "./image.js"
export * from "./markdown.js"
export * from "./search.js"

export type Location = {
  pathname: string
}

export type Frontmatter = {
  title?: string
  group?: string
  draft?: boolean
  [key: string]: any
}

export type Metadata = {
  title?: string
  group?: string
  draft?: boolean
  [key: string]: any
}

export type PageProps = {
  location: Location
  url: string
  title: string
  group: string
  draft: boolean
  [key: string]: any
}

export type GlobalProps = PageProps & {
  children: React.ReactNode
}

export type GetStaticData = {
  (): Promise<StaticData | StaticData[]>
}

export type StaticData = {
  paths?: { [key: string]: string }
  props: { [key: string]: any }
}

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
