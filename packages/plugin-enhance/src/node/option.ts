export type UserPluginOptions = {
  src?: string[]
  srcBases?: string[]
}

export type PluginOptions = {
  src: string[]
  srcBases: string[]
}

export const defaultOptions: PluginOptions = {
  src: ["/src/enhance/**/*.{tsx,jsx}", "/src/pages/**/*.enhance.{tsx,jsx}"],
  srcBases: ["/src/enhance", "/src/pages"],
}
