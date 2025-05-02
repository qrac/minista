import type { Config as SvgoConfig } from "svgo"

export type PluginOptions = {
  config?: SvgoConfig
}
export type UserPluginOptions = Partial<PluginOptions>

export type SvgProps = {
  src: string
  className?: string
  title?: string
  attributes?: React.SVGProps<SVGSVGElement>
} & React.SVGProps<SVGSVGElement>
