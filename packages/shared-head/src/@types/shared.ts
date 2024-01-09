export type HeadData = {
  htmlAttributes?: React.HTMLAttributes<HTMLHtmlElement>
  bodyAttributes?: React.HTMLAttributes<HTMLBodyElement>
  title?: string
  tags?: React.ReactElement[]
}

export type SetHeadData = (key: string, value: any) => void
