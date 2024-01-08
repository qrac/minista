export type HeadData = {
  htmlAttributes?: React.HTMLAttributes<HTMLHtmlElement>
  bodyAttributes?: React.HTMLAttributes<HTMLBodyElement>
  title?: string
  tags?: React.ReactNode[]
}

export type SetHeadData = (key: string, value: any) => void
