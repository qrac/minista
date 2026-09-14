import "minista/types"
import type pkg from "minista/package.json"
import type pjt from "./project.json"

type Pkg = typeof pkg
type Pjt = typeof pjt
type Locale = keyof Pjt["i18n"]["locales"]

type CustomProps = {
  layout: string
  locale: Locale
  description: string
  hasPrev: boolean
  hasNext: boolean
  noindex: boolean
  pkg: Pkg
  pjt: Pjt
}

declare module "minista/types" {
  interface Metadata extends Partial<CustomProps> {}
  interface PageProps extends CustomProps {}
  interface LayoutProps extends CustomProps {}
}
