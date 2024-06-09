type CustomHtmlAttributes = React.HTMLAttributes<HTMLHtmlElement> & {
  class?: string
}
type CustomBodyAttributes = React.HTMLAttributes<HTMLBodyElement> & {
  class?: string
}

export type HeadData = {
  htmlAttributes?: CustomHtmlAttributes
  bodyAttributes?: CustomBodyAttributes
  title?: string
  tags?: React.ReactElement[]
}

export type SetHeadData = (key: string, value: any) => void
