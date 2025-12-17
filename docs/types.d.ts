import "minista/types"
import type pkg from "minista/package.json"
import type site from "./src/assets/data/site"
import type menu from "./src/assets/data/menu"

type Pkg = typeof pkg
type Site = typeof site
type Menu = typeof menu

declare module "minista/types" {
  interface Metadata {
    layout?: string
    noindex?: boolean
    pkg?: Pkg
    site?: Site
    menu?: Menu
  }
  interface PageProps {
    layout: string
    noindex: boolean
    pkg: Pkg
    site: Site
    menu: Menu
  }
  interface LayoutProps {
    layout: string
    noindex: boolean
    pkg: Pkg
    site: Site
    menu: Menu
  }
}
