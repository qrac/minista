import type { Config as SvgoConfig } from "svgo"

export type PluginOptions = {
  config?: SvgoConfig
}
export type UserPluginOptions = Partial<PluginOptions>

export type SpriteProps = {
  src: string
  symbolId?: string
  className?: string
  title?: string
  attributes?: React.SVGProps<SVGSVGElement>
} & React.SVGProps<SVGSVGElement>
