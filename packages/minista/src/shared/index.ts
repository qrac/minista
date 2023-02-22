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

export type PageProps = {
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
