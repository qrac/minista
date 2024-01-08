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
