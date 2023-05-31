import type { HelmetProps } from "react-helmet-async"
import { Helmet } from "react-helmet-async"

type HeadProps = HelmetProps & {
  children?: React.ReactNode
}

export function Head(props: HeadProps) {
  const { children, ...attribute } = props
  return <Helmet {...attribute}>{children}</Helmet>
}
